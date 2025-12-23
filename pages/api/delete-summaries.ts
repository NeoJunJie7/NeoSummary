import type { NextApiRequest, NextApiResponse } from 'next';
import { firestore } from '../../lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, summaryIds } = req.body || {};

  if (!userId || !Array.isArray(summaryIds) || summaryIds.length === 0) {
    return res.status(400).json({ error: 'Missing userId or summaryIds' });
  }

  try {
    const batch = firestore.batch();
    const notOwned: string[] = [];

    for (const id of summaryIds) {
      if (typeof id !== 'string' || !id) continue;
      const docRef = firestore.collection('summaries').doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        continue; // Skip missing docs
      }

      const data = doc.data();
      if (data?.userId !== userId) {
        notOwned.push(id);
        continue;
      }

      batch.delete(docRef);
    }

    await batch.commit();

    return res.status(200).json({
      success: true,
      deletedIds: summaryIds.filter((id: string) => !notOwned.includes(id)),
      skippedIds: notOwned,
    });
  } catch (error: any) {
    console.error('Error deleting multiple summaries:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}


