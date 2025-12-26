import type { NextApiRequest, NextApiResponse } from 'next';
import { firestore, firebaseAdmin } from '../../lib/firebase-admin'; // Adjust path if needed

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, originalText, summaryText, config, title } = req.body;

  if (!userId || !originalText || !summaryText || !title) {
    return res.status(400).json({ error: 'Missing required data (userId, originalText, summaryText, or title)' });
  }

  try {
    const timestamp = firebaseAdmin.firestore.FieldValue.serverTimestamp();

    const docRef = await firestore.collection('summaries').add({
      userId,
      title: title.trim(),
      originalText,
      summaryText,
      config: config || {},
      timestamp,
    });

    return res.status(200).json({ success: true, message: 'Summary saved', summaryId: docRef.id });
  } catch (error) {
    console.error('Error saving summary:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}