import * as admin from 'firebase-admin';

// Protect from re-initializing if HOT-reloading in Next.js development
if (!admin.apps.length) {
    // If we have an explicit environment variable base64 encoded for deployment:
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountJson) {
        let serviceAccountData;
        try {
           serviceAccountData = JSON.parse(serviceAccountJson);
        } catch (e) {
           console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY json");
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccountData),
        });
    } else {
        // Fallback for local development if GOOGLE_APPLICATION_CREDENTIALS is set 
        // or just try initializing (will fail eventually if no creds are provided)
        console.warn("No explicit FIREBASE_SERVICE_ACCOUNT_KEY set. Falling back to default app.");
        admin.initializeApp();
    }
}

const dbAdmin = admin.firestore();

export { dbAdmin, admin };
