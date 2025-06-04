import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { error as logError } from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import type { TicketData } from "./types";

/*
 * Creates a new ticket document in 'tickets' collection.
 * Returns the new ticket document id.
 */
export const createTicketDoc = onCall(async (req) => {
	if (!req.auth) {
		throw new HttpsError("permission-denied", "not authenticated");
	}

	const uid = req.auth.uid;
	const ticketID = `ticket_${uid}`;
	const ticketRef = getFirestore().collection("tickets").doc(ticketID);

	let doc = null;
	try {
		doc = await ticketRef.get();
	} catch (error) {
		logError("Failed to check existing ticket", error);
		throw new HttpsError("internal", "Failed to check existing ticket");
	}

	if (!doc?.exists) {
		// create ticket document
		try {
			await ticketRef.set({
				userId: uid,
				ticketId: ticketID,
				foods: [],
				events: [],
				createdAt: Timestamp.now(),
			} satisfies TicketData);
		} catch (error) {
			logError("Failed to create ticket", error);
			throw new HttpsError("internal", "Failed to create ticket");
		}
	}

	return ticketID;
});
