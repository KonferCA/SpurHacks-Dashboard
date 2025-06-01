import { functions } from "@/services/firebase";
import { logError, logEvent } from "@/services/firebase/log";
import { httpsCallable } from "firebase/functions";
import type { CloudFunctionResponse } from "./types";

export async function verifyRSVP() {
	const verifyFn = httpsCallable(functions, "verifyRSVP");
	try {
		await verifyFn();
	} catch (e) {
		logEvent("error", {
			event: "verify_rsvp",
			message: (e as Error).message,
			name: (e as Error).name,
			stack: (e as Error).stack,
		});
		throw e; // pass it down for caller to handle
	}
}

export async function withdrawRSVP() {
	const fn = httpsCallable<unknown, CloudFunctionResponse<void>>(
		functions,
		"withdrawRSVP",
	);
	try {
		const res = await fn();
		const data = res.data;
		return data;
	} catch (error) {
		logError(error as Error, "error_dismissing_rsvp");
		throw error;
	}
}

export async function joinWaitlist() {
	const fn = httpsCallable<unknown, CloudFunctionResponse<void>>(
		functions,
		"joinWaitlist",
	);
	try {
		const res = await fn();
		const data = res.data;
		return data;
	} catch (error) {
		logError(error as Error, "error_joining_waitlist");
		throw error;
	}
}
