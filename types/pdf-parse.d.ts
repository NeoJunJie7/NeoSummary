declare module 'pdf-parse' {
  interface PdfData {
    text: string;
    numpages: number;
    // … other fields you don’t need
  }

  function pdfParse(buffer: Buffer | Uint8Array): Promise<PdfData>;
  export = pdfParse;
}