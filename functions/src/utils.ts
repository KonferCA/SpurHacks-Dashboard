import type { ApplicationData } from "./types";
import { error as logError } from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";

export enum HttpStatus {
	OK = 200,
	CREATED = 201,
	BAD_REQUEST = 400,
	UNAUTHORIZED = 401,
	NOT_FOUND = 404,
	INTERNAL_SERVER_ERROR = 500,
}

export function response<T>(
	status: HttpStatus,
	payload?: { message?: string; data?: T },
) {
	return {
		status,
		...payload,
	};
}

/*
 * getUserApplicationByYear is a utility function that fetches an application in Firestore
 * that matches the given uid and year.
 * Returns a tuple with the application data and the doc id.
 */
export async function getUserApplicationByYear(
	uid: string,
	year: string,
): Promise<[ApplicationData | undefined, string | undefined]> {
	let application: [ApplicationData | undefined, string | undefined] = [
		undefined,
		undefined,
	];
	try {
		const snap = await getFirestore()
			.collection("applications")
			.where("applicantId", "==", uid)
			.where("hackathonYear", "==", year)
			.get();
		application[0] = snap.docs[0]?.data() as ApplicationData;
		application[1] = snap.docs[0]?.id;
	} catch (error) {
		logError(error);
	}

	return application;
}
