
declare const firebase: any;

const firebaseConfig = {
  apiKey: "AIzaSyAE0XQSsEoBwuc0qeMpdAI3LkVexq1ifFo",
  authDomain: "sistema-juridico-tvde.firebaseapp.com",
  projectId: "sistema-juridico-tvde",
  storageBucket: "sistema-juridico-tvde.firebasestorage.app",
  messagingSenderId: "230989255976",
  appId: "1:230989255976:web:668bff417a2c51c0716c1d"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const firestore = firebase.firestore();