
declare const firebase: any;

// We declare auth and firestore as potentially null.
let auth: any = null;
let firestore: any = null;

const firebaseConfig = {
  apiKey: "AIzaSyAE0XQSsEoBwuc0qeMpdAI3LkVexq1ifFo",
  authDomain: "sistema-juridico-tvde.firebaseapp.com",
  projectId: "sistema-juridico-tvde",
  storageBucket: "sistema-juridico-tvde.firebasestorage.app",
  messagingSenderId: "230989255976",
  appId: "1:230989255976:web:668bff417a2c51c0716c1d"
};

// Check if firebase is loaded and initialize it.
// This prevents errors if the Firebase script fails to load.
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    // Assign the services to our exported variables.
    auth = firebase.auth();
    firestore = firebase.firestore();
} else {
    console.error("Firebase SDK not loaded. Authentication and database features will be disabled.");
}

// Export the (potentially null) services.
export { auth, firestore };