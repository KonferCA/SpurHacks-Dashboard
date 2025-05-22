import { AxiosError } from "axios";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { error as logError, info as logInfo } from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { GoogleAuth } from "google-auth-library";
import * as jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import type { Context } from "./types";

const credentials = {
	type: process.env.GOOGLE_WALLET_ACCOUNT_TYPE,
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

const googleAuthClient = new GoogleAuth({
	credentials: credentials,
	scopes: "https://www.googleapis.com/auth/wallet_object.issuer",
});

//Google wallet Object
export const createPassObject = onCall(async (data: any, res) => {
	const context = res as Context;
	if (!context?.auth) {
		throw new HttpsError("permission-denied", "Not authenticated");
	}
	const func = "createPassObject";
	const userId = context.auth.uid;

	const user = await getAuth().getUser(userId);
	const app = (
		await getFirestore()
			.collection("applications")
			.where("applicantId", "==", userId)
			.get()
	).docs[0]?.data();

	let firstName = app?.firstName;
	let lastName = app?.lastName;
	const type = user.customClaims?.type ?? "Guest";
	if (!app) {
		logInfo(
			"No application found for user. Will try to get name from user record.",
		);
		const [f, l] = user?.displayName?.split(" ") ?? [];
		firstName = f ?? "Unknown";
		lastName = l ?? "Hacker";
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

	const userEmail = context.auth.token?.email || data.email;

	const objectId = `${process.env.GOOGLE_WALLET_ISSUERID}.${userId}`;
	const classId = `${process.env.GOOGLE_WALLET_ISSUERID}.spurhacks-event-ticket`;
	const baseUrl = "https://walletobjects.googleapis.com/walletobjects/v1";

	const updatedGenericObject = {
		id: `${objectId}`,
		classId: `${classId}`,
		genericType: "GENERIC_TYPE_UNSPECIFIED",
		logo: {
			sourceUri: {
				uri: "https://spurhacks.com/icon.svg",
			},
			contentDescription: {
				defaultValue: {
					language: "en-US",
					value: "SpurHacks Logo",
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
				value: "Waterloo, ON",
			},
		},
		header: {
			defaultValue: {
				language: "en-US",
				value: "SpurHacks 2025",
			},
		},
		linksModuleData: {
			uris: [
				{
					kind: "walletobjects#uri",
					uri: "https://www.spurhacks.com",
					description: "Visit SpurHacks",
				},
			],
		},
		textModulesData: [
			{
				id: "NAME",
				header: "Name",
				body: `${firstName} ${lastName}`,
			},
			{
				id: "TYPE",
				header: "Type",
				body: type[0].toUpperCase() + type.substring(1),
			},
			{
				id: "EMAIL",
				header: "Email",
				body: `${userEmail}`,
			},
			{
				id: "FROM",
				header: "From",
				body: "June 20th",
			},
			{
				id: "TO",
				header: "To",
				body: "June 22th",
			},
		],
		barcode: {
			type: "QR_CODE",
			value: `${process.env.FE_URL}/ticket/${ticketId}`,
		},
		hexBackgroundColor: "#27393F",
		heroImage: {
			sourceUri: {
				// TODO: update to spurhacks hero image when available
				uri: "https://storage.googleapis.com/hawkhacks-dashboard.appspot.com/uploads%2Fwallet-banner.png",
			},
			contentDescription: {
				defaultValue: {
					language: "en-US",
					value: "Hero Image",
				},
			},
		},
	};

	try {
		// Try to fetch the existing object
		const existingObjectResponse = await googleAuthClient.request({
			url: `${baseUrl}/genericObject/${objectId}`,
			method: "GET",
		});

		if (existingObjectResponse.data) {
			// Object exists, update it
			const updateResponse = await googleAuthClient.request({
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
					const createResponse = await googleAuthClient.request({
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
