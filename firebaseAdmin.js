/* =========================================================
   INCLURA FIREBASE ADMIN
   Trusted server-side Firebase access
   ========================================================= */

const admin = require("firebase-admin");

let firebaseApp;

function getFirebaseAdmin() {
    if (firebaseApp) {
        return firebaseApp;
    }

    const serviceAccountJson =
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountJson) {
        throw new Error(
            "FIREBASE_SERVICE_ACCOUNT_JSON is not configured."
        );
    }

    let serviceAccount;

    try {
        serviceAccount = JSON.parse(serviceAccountJson);
    } catch {
        throw new Error(
            "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON."
        );
    }

    if (
        !serviceAccount.project_id ||
        !serviceAccount.client_email ||
        !serviceAccount.private_key
    ) {
        throw new Error(
            "Firebase service account credentials are incomplete."
        );
    }

    firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
            projectId: serviceAccount.project_id,
            clientEmail: serviceAccount.client_email,
            privateKey: serviceAccount.private_key.replace(
                /\\n/g,
                "\n"
            )
        })
    });

    return firebaseApp;
}

function getFirebaseAuth() {
    return getFirebaseAdmin() &&
        admin.auth(firebaseApp);
}

function getFirestore() {
    return getFirebaseAdmin() &&
        admin.firestore(firebaseApp);
}

module.exports = {
    getFirebaseAdmin,
    getFirebaseAuth,
    getFirestore
};
