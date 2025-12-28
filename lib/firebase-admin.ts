// lib/firebase-admin.ts
import admin from 'firebase-admin';

// Check for required environment variables
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

console.log('Firebase admin env vars check:', { projectId: !!projectId, clientEmail: !!clientEmail, privateKey: !!privateKey });

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Missing required Firebase environment variables. Check NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.");
}

const serviceAccount = {
  projectId,
  clientEmail,
  // This replace() is critical for Vercel to handle the private key's newlines
  privateKey: privateKey.replace(/\\n/g, '\n'),
};

console.log('Admin apps length before init:', admin.apps.length);

if (!admin.apps.length) {
  console.log('Initializing Firebase admin app');
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase admin app initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase admin app:', error);
    throw error;
  }
} else {
  console.log('Firebase admin app already exists');
}

{/*}
// Proceed with initialization using the validated and replaced key
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      // Use the validated key and apply the replacement
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}
  */}


// Export the default app (you can also export bucket, firestore, etc.)
export const firebaseAdmin = admin;
export const firestore = admin.firestore();
export const authAdmin = admin.auth();