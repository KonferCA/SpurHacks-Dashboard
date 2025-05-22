import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { error as logError } from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";

export const fetchOrGenerateTicket = onCall(async (req) => {
	if (!req.auth) {
		throw new HttpsError(
			"permission-denied",
			"User must be authenticated to initiate this operation.",
		);
	}

	const userId = req.auth.uid;
	const ticketsRef = getFirestore().collection("tickets");
	const ticketQuery = await ticketsRef
		.where("userId", "==", userId)
		.limit(1)
		.get();

	if (ticketQuery.empty) {
		let ticketId = "";
		let createTicket = false;
		const snap = await getFirestore()
			.collection("tickets")
			.where("userId", "==", userId)
			.get();
		const data = snap.docs[0]?.data();
		if (!data) {
			ticketId = uuidv4();
			createTicket = true;
		} else {
			ticketId = data.ticketId;
		}
		const qrCodeValue = `${process.env.FE_URL}/ticket/${ticketId}`;

		try {
			const qrCodeDataURL = await QRCode.toDataURL(qrCodeValue, {
				width: 256,
			});

			const base64Data = qrCodeDataURL.split(",")[1];
			const buffer = Buffer.from(base64Data, "base64");

			const storageRef = getStorage().bucket();
			const fileRef = storageRef.file(`qrCodes/${userId}/${ticketId}.png`);
			await fileRef.save(buffer, {
				metadata: {
					contentType: "image/png",
				},
			});

			await fileRef.makePublic();

			const qrCodeUrl = fileRef.publicUrl();

			if (createTicket) {
				await ticketsRef.doc(ticketId).set({
					userId: userId,
					ticketId: ticketId,
					qrCodeUrl: qrCodeUrl,
					foods: [],
					events: [],
					timestamp: new Date(),
				});
			} else {
				await getFirestore().collection("tickets").doc(ticketId).update({
					qrCodeUrl: qrCodeUrl,
					timestamp: new Date(),
				});
			}

			return { qrCodeUrl };
		} catch (error) {
			logError("Error generating or uploading QR code:", error);
			throw new HttpsError(
				"internal",
				"Failed to generate or upload QR code",
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	} else {
		const ticketData = ticketQuery.docs[0].data();
		return { qrCodeUrl: ticketData.qrCodeUrl as string };
	}
});
