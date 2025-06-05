import { firestore, functions } from "@/services/firebase";
import { logError } from "@/services/firebase/log";
import type {
	CloudFunctionResponse,
	ExtendedTicketData,
	TicketData,
} from "@/services/firebase/types";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { TICKETS_COLLECTION } from "./collections";

export async function getTicketData(id: string) {
	try {
		const fn = httpsCallable<unknown, CloudFunctionResponse<TicketData>>(
			functions,
			"getTicketData",
		);
		const { data } = await fn({ id });
		return data;
	} catch (e) {
		await logError(e as Error, "get_ticket_data_error");
		throw e;
	}
}

// admin view of the ticket
// includes information about the food/events the hacker has been to
export async function getExtendedTicketData(id: string) {
	try {
		const fn = httpsCallable<
			unknown,
			CloudFunctionResponse<ExtendedTicketData>
		>(functions, "getExtendedTicketData");
		const { data } = await fn({ id });
		return data;
	} catch (e) {
		await logError(e as Error, "get_extended_ticket_data_error");
		throw e;
	}
}

export async function createTicketDoc() {
	try {
		const fn = httpsCallable<unknown, CloudFunctionResponse<string>>(
			functions,
			"createTicketDoc",
		);
		const { data } = await fn();
		return data.data;
	} catch (error) {
		await logError(error as Error, "create_ticket_doc_error").catch((err) =>
			console.error("Failed to log error", err),
		);
		throw error;
	}
}

export async function existsTicketDoc(ticketID: string) {
	try {
		const docRef = doc(firestore, TICKETS_COLLECTION, ticketID);
		const docSnap = await getDoc(docRef);
		return docSnap.exists();
	} catch (error) {
		await logError(error as Error, "get_home_cooked_qr_code_error").catch(
			(err) => console.error("Failed to log error", err),
		);
	}
	return false;
}
