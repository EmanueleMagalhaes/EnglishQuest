import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, getDocs, Timestamp, writeBatch, doc } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { QuizHistoryItem } from "../types";

// Your web app's Firebase configuration
// These are loaded from environment variables for security
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only if config is present
let app;
let auth: any;
let db: any;
let analytics: any;
let googleProvider: any;

const isFirebaseConfigured = () => {
    return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

if (isFirebaseConfigured()) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        googleProvider = new GoogleAuthProvider();
        
        // Initialize Analytics if supported in this environment
        if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
             try {
                analytics = getAnalytics(app);
             } catch (e) {
                 console.warn("Analytics failed to initialize (likely due to blocked cookies/Environment)", e);
             }
        }
    } catch (error) {
        console.error("Firebase initialization failed:", error);
    }
}

export const signInWithGoogle = async () => {
    if (!auth) throw new Error("Firebase not configured");
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Error signing in", error);
        throw error;
    }
};

export const logOut = async () => {
    if (!auth) return;
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out", error);
    }
};

export const saveScoreToFirestore = async (user: User, scoreData: QuizHistoryItem) => {
    if (!db) return;
    try {
        await addDoc(collection(db, "users", user.uid, "history"), {
            ...scoreData,
            createdAt: Timestamp.now() // Server timestamp for better sorting
        });
    } catch (error) {
        console.error("Error saving score", error);
    }
};

export const syncLocalHistoryToFirestore = async (user: User) => {
    if (!db) return;
    
    try {
        const localHistoryJSON = localStorage.getItem('quizHistory');
        if (!localHistoryJSON) return;

        const localHistory: QuizHistoryItem[] = JSON.parse(localHistoryJSON);
        if (localHistory.length === 0) return;

        // Use a batch write for better performance and atomicity
        const batch = writeBatch(db);
        const historyCollection = collection(db, "users", user.uid, "history");

        localHistory.forEach(item => {
            const newDocRef = doc(historyCollection);
            batch.set(newDocRef, {
                ...item,
                createdAt: Timestamp.now(),
                syncedFromLocal: true
            });
        });

        await batch.commit();
        
        // Clear local storage after successful sync
        localStorage.removeItem('quizHistory');
        console.log(`Synced ${localHistory.length} items to cloud.`);
        
    } catch (error) {
        console.error("Error syncing local history:", error);
    }
};

export const getMonthlyStatsFromFirestore = async (user: User) => {
    if (!db) return { score: 0, quizzes: 0 };
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    try {
        const historyRef = collection(db, "users", user.uid, "history");
        
        const q = query(historyRef); 
        const querySnapshot = await getDocs(q);
        
        let totalScore = 0;
        let count = 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Handle both ISO string dates and Firestore Timestamps
            const quizDate = data.createdAt ? data.createdAt.toDate() : new Date(data.date);
            
            if (quizDate >= thirtyDaysAgo) {
                totalScore += (data.score || 0);
                count++;
            }
        });

        return { score: totalScore, quizzes: count };
    } catch (error) {
        console.error("Error getting stats", error);
        return { score: 0, quizzes: 0 };
    }
};

export { auth, db, isFirebaseConfigured };