import { AxiosError } from "axios";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { error as logError, info as logInfo } from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { GoogleAuth } from "google-auth-library";
import * as jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { cors } from "./cors";

const credentials = {
	type: process.env.GOOGLE_WALLET_TYPE,
	client_email: process.env.GOOGLE_WALLET_CLIENT_EMAIL,
	client_id: process.env.GOOGLE_WALLET_CLIENT_ID,
	private_key: process.env.GOOGLE_WALLET_PRIVATE_KEY,
	private_key_id: process.env.GOOGLE_WALLET_PRIVATE_KEY_ID,
	project_id: process.env.GOOGLE_WALLET_PROJECT_ID,
	universe_domain: process.env.GOOGLE_WALLET_UNIVERSE_DOMAIN,
	token_uri: process.env.GOOGLE_WALLET_TOKEN_URI,
	issuerid: process.env.GOOGLE_WALLET_ISSUERID,
	auth_provider_x509_cert_url:
		process.env.GOOGLE_WALLET_AUTH_PROVIDER_X509_CERT_URL,
	auth_uri: process.env.GOOGLE_WALLET_AUTH_URI,
	client_x509_cert_url: process.env.GOOGLE_WALLET_CLIENT_X509_CERT_URL,
};

const httpClient = new GoogleAuth({
	credentials: credentials,
	scopes: "https://www.googleapis.com/auth/wallet_object.issuer",
});

//Google wallet Object
export const addToGoogleWallet = onCall({ cors }, async (req) => {
	if (!req.auth) {
		throw new HttpsError("permission-denied", "Not authenticated");
	}

	const func = "addToGooleWallet";
	const userId = req.auth.uid;

	const user = await getAuth().getUser(userId);
	const app = (
		await getFirestore()
			.collection("applications")
			.where("applicantId", "==", userId)
			.get()
	).docs[0]?.data();

	if (!app) {
		throw new HttpsError("invalid-argument", "No application");
	}

	let firstName = app.firstName;
	let lastName = app.lastName;
	const type = parseUserType(user.customClaims?.type);

	if (!app) {
		logInfo(
			"No application found for user. Will try to get name from user record.",
		);
		const [f, l] = user?.displayName?.split(" ") ?? ["Unknown", "Hacker"];
		firstName = f;
		lastName = l;
	}

	let ticketId = "";
	const ticketsRef = getFirestore().collection("tickets");
	const ticketDoc = (await ticketsRef.where("userId", "==", userId).get())
		.docs[0];
	if (!ticketDoc) {
		ticketId = uuidv4();
		await ticketsRef.doc(ticketId).set({
			userId: userId,
			ticketId,
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

	const userEmail = app.email;

	const objectSuffix = userEmail.replace(/[^\w.-]/g, "_");
	const objectId = `${process.env.GOOGLE_WALLET_ISSUERID}.${objectSuffix}`;
	const classId = `${process.env.GOOGLE_WALLET_ISSUERID}.spurhacks-generic-ticket`;
	const baseUrl = "https://walletobjects.googleapis.com/walletobjects/v1";
	const qrCodeValue = `https://dashboard.spurhacks.com/ticket/${ticketId}`;

	const updatedGenericObject = {
		id: `${objectId}`,
		classId: `${classId}`,
		logo: {
			sourceUri: {
				uri: "https://dashboard.spurhacks.com/gradient-icon.png",
			},
			contentDescription: {
				defaultValue: {
					language: "en-US",
					value: "LOGO_IMAGE_DESCRIPTION",
				},
			},
		},
		cardTitle: {
			defaultValue: {
				language: "en-US",
				value: "SpurHacks 2025",
			},
		},
		subheader: {
			defaultValue: {
				language: "en-US",
				value: "Attendee",
			},
		},
		header: {
			defaultValue: {
				language: "en-US",
				value: `${firstName} ${lastName}`,
			},
		},
		textModulesData: [
			{
				id: "event_address",
				header: "Event Address",
				body: "SPUR Campus",
			},
			{
				id: "building",
				header: "Building",
				body: "Rim C",
			},
			{
				id: "type",
				header: "Type",
				body: type,
			},
			{
				id: "date",
				header: "Date",
				body: "6/20-6/22",
			},
			{
				id: "start_time",
				header: "Start Time",
				body: "5:00PM",
			},
		],
		barcode: {
			type: "QR_CODE",
			value: qrCodeValue,
			alternateText: "",
		},
		hexBackgroundColor: "#13151c",
		heroImage: {
			sourceUri: {
				uri: "https://dashboard.spurhacks.com/google-wallet-header-pic.png",
			},
			contentDescription: {
				defaultValue: {
					language: "en-US",
					value: "HERO_IMAGE_DESCRIPTION",
				},
			},
		},
	};

	try {
		// Try to fetch the existing object
		const existingObjectResponse = await httpClient.request({
			url: `${baseUrl}/genericObject/${objectId}`,
			method: "GET",
		});

		if (existingObjectResponse.data) {
			// Object exists, update it
			const updateResponse = await httpClient.request({
				url: `${baseUrl}/genericObject/${objectId}`,
				method: "PATCH",
				data: updatedGenericObject,
			});
			logInfo("Pass updated successfully", updateResponse.data, func);
		}
	} catch (error) {
		// Object does not exist, create it
		if (error instanceof AxiosError) {
			if (error.response && error.response.status === 404) {
				try {
					const createResponse = await httpClient.request({
						url: `${baseUrl}/genericObject`,
						method: "POST",
						data: updatedGenericObject,
					});
					logInfo("Pass created successfully", createResponse.data, func);
				} catch (creationError) {
					if (creationError instanceof AxiosError) {
						logError(
							"Failed to create pass object",
							creationError.message,
							func,
						);
					} else {
						logError("Failed to create pass object", creationError, func);
					}
				}
			} else {
				logError("Error fetching pass object", error.message, func);
			}
		} else {
			logError("An unexpected error occurred", error, func);
		}
	}

	const claims = {
		iss: credentials.client_email,
		aud: "google",
		origins: [],
		typ: "savetowallet",
		payload: {
			genericObjects: [updatedGenericObject],
		},
	};

	if (!credentials.private_key) {
		logError("Missing private key in Google credentials");
		throw new HttpsError(
			"internal",
			"Server configuration error: Missing private key",
		);
	}

	const token = jwt.sign(claims, credentials.private_key, {
		algorithm: "RS256",
	});
	const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

	return { url: saveUrl };
});

function parseUserType(userType?: string) {
	// Default to N/A
	if (!userType) return "N/A";

	// Capitalize
	return userType
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
}
