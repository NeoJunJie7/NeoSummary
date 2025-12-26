import type { NextApiRequest, NextApiResponse } from 'next';
import { firestore } from '../../lib/firebase-admin'; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid userId parameter' });
  }

  try {
    // 1. Construct the secure query using Admin SDK
    const summariesRef = firestore.collection('summaries');
    const q = summariesRef
      .where('userId', '==', userId);
      

    const snapshot = await q.get();

    // 2. Map the results, including the document ID, and sort by timestamp
    const summaries = snapshot.docs.map(doc => {
      const data: any = doc.data();
      const ts = data.timestamp?.toMillis?.() ?? data.timestamp ?? null;

      return {
        id: doc.id,
        ...data,
        timestamp: ts,                 
        timestampIso: ts ? new Date(ts).toISOString() : null,
      };
    }).sort((a, b) => {
      // Sort by timestamp descending (newest first)
      const timestampA = (a as any).timestamp ?? 0;
      const timestampB = (b as any).timestamp ?? 0;
      return timestampB - timestampA;
    });

    // 3. Return the summaries successfully
    return res.status(200).json({ summaries });

  } catch (error) {
    console.error('SERVER ERROR: Failed to fetch summaries from Firestore:', error);
    
    return res.status(500).json({ error: 'Internal server error while retrieving history.' });
  }
}