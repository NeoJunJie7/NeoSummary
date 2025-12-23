// lib/firebase-admin.ts
import admin from 'firebase-admin';
import {getFirestore} from 'firebase/firestore';

const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');

// Check for the key explicitly and throw an error if missing
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (!privateKey) {
  throw new Error("Missing FIREBASE_PRIVATE_KEY environment variable. Check your .env.local or deployment settings.");
}

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

const db = getFirestore();

// Export the default app (you can also export bucket, firestore, etc.)
export const firebaseAdmin = admin;
export const bucket = admin.storage().bucket();
export const firestore = admin.firestore();
export const authAdmin = admin.auth();