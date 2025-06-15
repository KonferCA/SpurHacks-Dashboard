import * as fs from "node:fs";
import * as path from "node:path";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { error as logError, info as logInfo } from "firebase-functions/logger";
import {
	type CallableRequest,
	HttpsError,
	onCall,
} from "firebase-functions/v2/https";
import { PKPass } from "passkit-generator";
import { v4 as uuidv4 } from "uuid";
import { cors } from "./cors";

const signerCert = process.env.APPLE_WALLET_CERTS_SIGNER_CERT;
const signerKey = process.env.APPLE_WALLET_CERTS_SIGNER_KEY;
const wwdr = process.env.APPLE_WALLET_CERTS_WWDR_CERT;
const signerKeyPassphrase =
	process.env.APPLE_WALLET_CERTS_SIGNER_KEY_PASSPHRASE;
const teamIdentifier = process.env.APPLE_WALLET_CERTS_TEAM_ID;

// apple wallet ticket
export const createTicket = onCall({ cors }, async (request: CallableRequest) => {
	if (!request.auth) {
		logError("createTicket: Not authenticated - request.auth is missing.");
		throw new HttpsError("permission-denied", "Not authenticated");
	}
	const contextAuth = request.auth;
	logInfo("createTicket: Auth context present:", contextAuth);

	try {
		const userId = contextAuth.uid;

		const user = await getAuth().getUser(userId);
		const app = (
			await getFirestore()
				.collection("applications")
				.where("applicantId", "==", userId)
				.get()
		).docs[0]?.data();

		const role = app?.participatingAs ?? "Hacker";

		let firstName = app?.firstName;
		let lastName = app?.lastName;
		if (!app) {
			logInfo(
				"No application found for user. Will try to get name from user record.",
			);
			const [f, l] = user?.displayName?.split(" ") ?? [
				user.customClaims?.type ?? "N/A",
				"N/A",
			];
			firstName = f;
			lastName = l;
		}

		const ticketsRef = getFirestore().collection("tickets");
		const ticketDoc = (await ticketsRef.where("userId", "==", userId).get())
			.docs[0];
		let ticketId = "";
		if (!ticketDoc) {
			ticketId = uuidv4();
			await ticketsRef.doc(ticketId).set({
				userId: userId,
				ticketId: ticketId,
				firstName: firstName,
				lastName: lastName,
				timestamp: new Date(),
			});
		} else {
			ticketId = ticketDoc.id;
			await ticketsRef.doc(ticketId).update({
				userId: userId,
				ticketId: ticketId,
				firstName: firstName,
				lastName: lastName,
				timestamp: new Date(),
			});
		}

		const passJsonBuffer = Buffer.from(
			JSON.stringify({
				passTypeIdentifier: "pass.pass.com.spurhacks.eventticket",
				formatVersion: 1,
				teamIdentifier: teamIdentifier,
				organizationName: "SpurHacks",
				serialNumber: ticketId,
				description: "SpurHacks 2025 Event Pass",
				foregroundColor: "rgb(255, 255, 255)",
				backgroundColor: "rgb(19, 21, 28)",
				labelColor: "rgb(170, 170, 185)",
				barcodes: [
					{
						message: `${process.env.FE_URL}/ticket/${ticketId}`,
						format: "PKBarcodeFormatQR",
						messageEncoding: "iso-8859-1",
					},
				],
				locations: [
					{
						latitude: 29.584,
						longitude: -98.6194,
						relevantText: "SpurHacks Event Entrance",
					},
				],
				eventTicket: {
					headerFields: [
						{
							key: "userRole",
							label: "",
							value: role,
						},
					],
					primaryFields: [],
					secondaryFields: [
						{
							key: "attendeeName",
							label: "ATTENDEE",
							value: `${firstName} ${lastName}`,
						},
					],
					auxiliaryFields: [
						{
							key: "eventLocation",
							label: "EVENT ADDRESS",
							value: "SPUR Campus, Rim C",
						},
						{
							key: "eventDate",
							label: "DATE",
							value: "2025-06-20",
							textAlignment: "PKTextAlignmentRight",
						},
					],
					backFields: [
						{
							key: "moreInfo",
							label: "More Info",
							value: "For more details, visit our website at spurhacks.com",
						},
						{
							key: "emergencyContact",
							label: "Emergency Contact",
							value: "911",
						},
					],
				},
				images: {
					logo: {
						filename: "logo.png",
					},
					"logo@2x": {
						filename: "logo@2x.png",
					},
					icon: {
						filename: "icon.png",
					},
					"icon@2x": {
						filename: "icon@2x.png",
					},
					strip: {
						filename: "strip.png",
					},
					"strip@2x": {
						filename: "strip@2x.png",
					},
				},
			}),
		);

		// load all required images
		const assetsDir = path.join(__dirname, "..", "assets");
		const logoBuffer = fs.readFileSync(path.join(assetsDir, "logo-banner.png"));
		const iconBuffer = fs.readFileSync(path.join(assetsDir, "spur-icon.png"));
		const icon2xBuffer = fs.readFileSync(
			path.join(assetsDir, "spur-icon@2x.png"),
		);
		const stripBuffer = fs.readFileSync(
			path.join(assetsDir, "dark-theme", "strip.png"),
		);
		const strip2xBuffer = fs.readFileSync(
			path.join(assetsDir, "dark-theme", "strip@2x.png"),
		);

		// validate certificates
		if (!signerCert || !signerKey || !wwdr) {
			throw new HttpsError("internal", "missing apple wallet certificates");
		}

		// prepare pass files
		const passTemplateFiles: { [key: string]: Buffer } = {
			"pass.json": passJsonBuffer,
			"icon.png": iconBuffer,
			"icon@2x.png": icon2xBuffer,
			"logo.png": logoBuffer,
			"logo@2x.png": logoBuffer,
			"strip.png": stripBuffer,
			"strip@2x.png": strip2xBuffer,
		};

		// prepare certificates
		const certificatesPayload = {
			signerCert,
			signerKey,
			wwdr,
			...(signerKeyPassphrase && { signerKeyPassphrase }),
		};

		// generate and upload pass
		const pass = new PKPass(passTemplateFiles, certificatesPayload);
		const buffer = pass.getAsBuffer();

		const fileRef = getStorage().bucket().file(`passes/${userId}/pass.pkpass`);
		await fileRef.save(buffer, {
			metadata: { contentType: "application/vnd.apple.pkpass" },
		});
		await fileRef.makePublic();

		return { url: fileRef.publicUrl() };
	} catch (error) {
		logError("failed to create apple wallet pass:", error);
		throw new HttpsError("internal", "failed to create ticket");
	}
});
