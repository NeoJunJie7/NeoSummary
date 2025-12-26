import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';

export const config = {
  api: {
    bodyParser: false
  }
};

// Add a page renderer that reconstructs lines and injects spaces
async function renderPdfPage(page: any) {
  const textContent = await page.getTextContent({ disableCombineTextItems: true });

  type Item = { str: string; transform: number[]; width: number; height: number; };
  const items = textContent.items as Item[];

  const lines: string[] = [];
  let currentLine: string[] = [];
  let lastY: number | null = null;
  let lastXEnd = 0;

  // Tune thresholds as needed per PDF
  const LINE_THRESHOLD_MULT = 0.8;     
  const SPACE_THRESHOLD_MULT = 0.10;   

  for (const it of items) {
    const [a, b, c, d, e, f] = it.transform; // e=x, f=y
    const x = e;
    const y = f;
    const fontHeight = Math.hypot(b, d) || it.height || 12;
    const xEnd = x + it.width;

    if (lastY === null) {
      currentLine.push(it.str);
      lastY = y;
      lastXEnd = xEnd;
      continue;
    }

    // New line detection
    const isNewLine = Math.abs(y - lastY) > fontHeight * LINE_THRESHOLD_MULT;
    if (isNewLine) {
      lines.push(currentLine.join(''));
      currentLine = [it.str];
      lastY = y;
      lastXEnd = xEnd;
      continue;
    }

    // Insert space if the gap between items is big enough
    const gap = x - lastXEnd;
    if (gap > fontHeight * SPACE_THRESHOLD_MULT) currentLine.push(' ');

    currentLine.push(it.str);
    lastXEnd = xEnd;
  }

  if (currentLine.length) lines.push(currentLine.join(''));

  // Normalize common edge cases (bullets, weird spacing)
  const text = lines
    .join('\n')
    .replace(/\u2022(?!\s)/g, '• ')       // ensure a space after bullets
    .replace(/[ \t]+/g, ' ')              // collapse repeated spaces
    .replace(/\s+\n/g, '\n')              // trim trailing spaces
    .trim();

  return text;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({
    keepExtensions: true,
    maxFileSize: 15 * 1024 * 1024, // 15MB
  });

  try {
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const buffer = fs.readFileSync(file.filepath);
    let text = '';

    if (file.mimetype === 'application/pdf') {
      // Use custom page renderer
      const pdfData = await pdfParse(buffer, {
        pagerender: renderPdfPage,
        max: 0 // 0 = all pages
      });
      text = pdfData.text;
    } 
    else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }
    // ADDED SUPPORT FOR PLAIN TEXT FILES
    else if (file.mimetype === 'text/plain') {
      // Read the buffer directly as a UTF-8 string
      text = buffer.toString('utf-8');
    }
    else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload PDF, DOCX, or TXT.' });
    }

    try {
      fs.unlinkSync(file.filepath);
    } catch (e) {
      console.error('Failed to clean up temp file:', e);
    }

    if (!text.trim()) {
      return res.status(400).json({ error: 'Could not extract text from file' });
    }

    return res.status(200).json({ text });
  } catch (err: any) {
    console.error('Document processing error:', err);
    return res.status(500).json({ error: String(err?.message ?? 'Failed to process document') });
  }
}