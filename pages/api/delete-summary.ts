import type { NextApiRequest, NextApiResponse } from 'next';
import { firestore } from '../../lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, summaryId } = req.body;

  if (!userId || !summaryId) {
    return res.status(400).json({ error: 'Missing userId or summaryId' });
  }

  try {
    // Get the document first to verify it belongs to the user
    const docRef = firestore.collection('summaries').doc(summaryId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    const data = doc.data();
    if (data?.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized: You can only delete your own summaries' });
    }

    // Delete the document
    await docRef.delete();

    return res.status(200).json({ success: true, message: 'Summary deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting summary:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}