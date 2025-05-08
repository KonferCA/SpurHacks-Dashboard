import { firestore } from "@/services/firebase";
import {
	APPLICATIONS_COLLECTION,
	APPLICATION_DRAFTS_COLLECTION,
} from "@/services/firebase/collections";
import { logEvent } from "@/services/firebase/log";
import {
	Timestamp,
	addDoc,
	collection,
	doc,
	getDocs,
	query,
	updateDoc,
	where,
} from "firebase/firestore";

import type { ApplicationData } from "@/forms/hacker-form/types";
import type { ApplicationDataDoc } from "./types";

/**
 * Submits an application to firebase
 */
export async function submitApplication(data: ApplicationData, uid: string) {
	// Remove undefined entries
	const payload = Object.fromEntries(
		Object.entries({
			...data,
			applicantId: uid,
			timestamp: Timestamp.now(),
			hackathonYear: "2025",
			applicationStatus: "pending",
			rsvp: false,
		}).filter(([_, value]) => value !== undefined),
	);

	try {
		const appsRef = collection(firestore, APPLICATIONS_COLLECTION);
		await addDoc(appsRef, payload);
	} catch (e) {
		logEvent("error", {
			event: "app_submit_error",
			message: (e as Error).message,
			name: (e as Error).name,
			stack: (e as Error).stack,
		});
		// pass this along so that the application page handles the error
		throw e;
	}
}

async function getApplications(
	uid: string,
	col: string,
	onErrorEventName: string,
): Promise<ApplicationDataDoc[]> {
	try {
		const colRef = collection(firestore, col);
		const q = query(colRef, where("applicantId", "==", uid));
		const snap = await getDocs(q);
		const apps: ApplicationDataDoc[] = [];
		snap.forEach((doc) => {
			const data = doc.data() as ApplicationData;
			apps.push({ ...data, __docId: doc.id });
		});
		return apps;
	} catch (e) {
		logEvent("error", {
			event: onErrorEventName,
			message: (e as Error).message,
			name: (e as Error).name,
			stack: (e as Error).stack,
		});
	}
	return [];
}

/**
 * Gets all the applications from a given user
 */
export async function getUserApplications(uid: string) {
	return await getApplications(
		uid,
		APPLICATIONS_COLLECTION,
		"search_applications_error",
	);
}

export async function getApplicationsDraft(uid: string) {
	return await getApplications(
		uid,
		APPLICATION_DRAFTS_COLLECTION,
		"search_application_drafts_error",
	);
}

export async function saveApplicationDraft(
	data: ApplicationData,
	uid: string,
	draftId?: string,
) {
	// Remove undefined entries
	const payload = Object.fromEntries(
		Object.entries({
			...data,
			applicantId: uid,
			timestamp: Timestamp.now(),
			hackathonYear: "2025",
			applicationStatus: "draft",
			rsvp: false,
		}).filter(([_, value]) => value !== undefined),
	);

	if (!draftId) {
		const drafts = await getApplicationsDraft(uid);
		if (drafts.length) {
			draftId = drafts[0].__docId;
		}
	}

	try {
		if (draftId) {
			const ref = doc(firestore, APPLICATION_DRAFTS_COLLECTION, draftId);
			await updateDoc(ref, payload);
			return;
		}
		const appsRef = collection(firestore, APPLICATION_DRAFTS_COLLECTION);
		await addDoc(appsRef, payload);
	} catch (e) {
		logEvent("error", {
			event: "app_draft_save_error",
			message: (e as Error).message,
			name: (e as Error).name,
			stack: (e as Error).stack,
		});
		// pass this along so that the application page handles the error
		throw e;
	}
}
