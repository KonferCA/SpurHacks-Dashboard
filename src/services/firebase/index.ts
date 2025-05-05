import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { ReCaptchaV3Provider, initializeAppCheck } from "firebase/app-check";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID,
	measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const firestore = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);
// @ts-ignore self refers to the window object that is used by the appcheck in debug mode
self.FIREBASE_APPCHECK_DEBUG_TOKEN =
	import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;
initializeAppCheck(app, {
	provider: new ReCaptchaV3Provider(import.meta.env.VITE_APP_CHECK_KEY),
	isTokenAutoRefreshEnabled: true,
});

// connect to emulators if not in prod
if (!import.meta.env.PROD && import.meta.env.VITE_APP_ENV === "development") {
	const firestoreEmuPort = parseInt(import.meta.env.VITE_FIRESTORE_EMU_PORT);
	const authEmuPort = parseInt(import.meta.env.VITE_AUTH_EMU_PORT);
	const fnEmuPort = parseInt(import.meta.env.VITE_FUNCTIONS_EMU_PORT);
	const storageEmuPort = parseInt(import.meta.env.VITE_STORAGE_EMU_PORT);

	connectFirestoreEmulator(firestore, "127.0.0.1", firestoreEmuPort);
	connectAuthEmulator(auth, `http://127.0.0.1:${authEmuPort}`, {
		disableWarnings: true,
	});
	connectStorageEmulator(storage, "127.0.0.1", storageEmuPort);
	connectFunctionsEmulator(functions, "127.0.0.1", fnEmuPort);
}
