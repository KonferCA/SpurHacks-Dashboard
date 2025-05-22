import { AxiosError } from "axios";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { error as logError, info as logInfo } from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { GoogleAuth } from "google-auth-library";
import * as jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

// Configuration interface for better type safety
interface GoogleWalletConfig {
	type: string;
	client_email: string;
	client_id: string;
	private_key: string;
	private_key_id: string;
	project_id: string;
	universe_domain: string;
	token_uri: string;
	issuerid: string;
	auth_provider_x509_cert_url: string;
	auth_uri: string;
	client_x509_cert_url: string;
}

interface TicketData {
	userId: string;
	ticketId: string;
	firstName: string;
	lastName: string;
	email: string;
	type: string;
	walletObjectId: string;
	saveUrl: string;
	createdAt: Date;
	updatedAt: Date;
}

// Load configuration with validation
const loadGoogleWalletConfig = (): GoogleWalletConfig => {
	const requiredEnvVars = [
		"GOOGLE_WALLET_ACCOUNT_TYPE",
		"GOOGLE_WALLET_CLIENT_EMAIL",
		"GOOGLE_WALLET_CLIENT_ID",
		"GOOGLE_WALLET_PRIVATE_KEY",
		"GOOGLE_WALLET_PRIVATE_KEY_ID",
		"GOOGLE_WALLET_PROJECT_ID",
		"GOOGLE_WALLET_UNIVERSE_DOMAIN",
		"GOOGLE_WALLET_TOKEN_URI",
		"GOOGLE_WALLET_ISSUERID",
		"GOOGLE_WALLET_AUTH_PROVIDER_X509_CERT_URL",
		"GOOGLE_WALLET_AUTH_URI",
		"GOOGLE_WALLET_CLIENT_X509_CERT_URL",
	];

	for (const envVar of requiredEnvVars) {
		if (!process.env[envVar]) {
			throw new HttpsError(
				"internal",
				`Missing required environment variable: ${envVar}`,
			);
		}
	}

	return {
		type: process.env.GOOGLE_WALLET_ACCOUNT_TYPE!,
		client_email: process.env.GOOGLE_WALLET_CLIENT_EMAIL!,
		client_id: process.env.GOOGLE_WALLET_CLIENT_ID!,
		private_key: process.env.GOOGLE_WALLET_PRIVATE_KEY!.replace(/\\n/g, "\n"),
		private_key_id: process.env.GOOGLE_WALLET_PRIVATE_KEY_ID!,
		project_id: process.env.GOOGLE_WALLET_PROJECT_ID!,
		universe_domain: process.env.GOOGLE_WALLET_UNIVERSE_DOMAIN!,
		token_uri: process.env.GOOGLE_WALLET_TOKEN_URI!,
		issuerid: process.env.GOOGLE_WALLET_ISSUERID!,
		auth_provider_x509_cert_url:
			process.env.GOOGLE_WALLET_AUTH_PROVIDER_X509_CERT_URL!,
		auth_uri: process.env.GOOGLE_WALLET_AUTH_URI!,
		client_x509_cert_url: process.env.GOOGLE_WALLET_CLIENT_X509_CERT_URL!,
	};
};

// Initialize Google Auth client
const initializeGoogleAuth = (config: GoogleWalletConfig) => {
	return new GoogleAuth({
		credentials: config,
		scopes: "https://www.googleapis.com/auth/wallet_object.issuer",
	});
};

// Get user information from Firebase Auth and application data
const getUserInfo = async (userId: string) => {
	const [user, applicationSnapshot] = await Promise.all([
		getAuth().getUser(userId),
		getFirestore()
			.collection("applications")
			.where("applicantId", "==", userId)
			.limit(1)
			.get(),
	]);

	const application = applicationSnapshot.docs[0]?.data();

	let firstName: string;
	let lastName: string;

	if (application?.firstName && application?.lastName) {
		firstName = application.firstName;
		lastName = application.lastName;
	} else {
		logInfo(
			"No application found for user. Using display name from user record.",
		);
		const nameParts = user?.displayName?.split(" ") ?? [];
		firstName = nameParts[0] ?? "Unknown";
		lastName = nameParts.slice(1).join(" ") || "User";
	}

	const type = user.customClaims?.type ?? "Guest";

	return {
		user,
		firstName,
		lastName,
		type,
	};
};

// Create or update ticket in Firestore
const createOrUpdateTicket = async (
	userId: string,
	firstName: string,
	lastName: string,
	email: string,
	type: string,
	walletObjectId: string,
	saveUrl: string,
): Promise<string> => {
	const ticketsRef = getFirestore().collection("tickets");
	const existingTicketSnapshot = await ticketsRef
		.where("userId", "==", userId)
		.limit(1)
		.get();

	const now = new Date();
	const ticketData: Partial<TicketData> = {
		userId,
		firstName,
		lastName,
		email,
		type,
		walletObjectId,
		saveUrl,
		updatedAt: now,
	};

	if (existingTicketSnapshot.empty) {
		// Create new ticket
		const ticketId = uuidv4();
		const fullTicketData: TicketData = {
			...(ticketData as TicketData),
			ticketId,
			createdAt: now,
		};

		await ticketsRef.doc(ticketId).set(fullTicketData);
		logInfo(`New ticket created for user ${userId} with ID ${ticketId}`);
		return ticketId;
	} else {
		// Update existing ticket
		const existingTicket = existingTicketSnapshot.docs[0];
		const ticketId = existingTicket.id;

		await ticketsRef.doc(ticketId).update(ticketData);
		logInfo(`Ticket updated for user ${userId} with ID ${ticketId}`);
		return ticketId;
	}
};

// Create Google Wallet object payload
const createWalletObject = (
	objectId: string,
	classId: string,
	firstName: string,
	lastName: string,
	type: string,
	email: string,
	ticketId: string,
) => {
	return {
		id: objectId,
		classId: classId,
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
				value: "SPUR Campus",
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
				body: type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(),
			},
			{
				id: "EMAIL",
				header: "Email",
				body: email,
			},
			{
				id: "FROM",
				header: "From",
				body: "June 20th",
			},
			{
				id: "TO",
				header: "To",
				body: "June 22nd", // Fixed typo: "22th" -> "22nd"
			},
		],
		barcode: {
			type: "QR_CODE",
			value: `${process.env.FE_URL}/ticket/${ticketId}`,
		},
		hexBackgroundColor: "#27393F",
		heroImage: {
			sourceUri: {
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
};

// Handle Google Wallet API operations
const handleWalletApiOperations = async (
	googleAuthClient: GoogleAuth,
	objectId: string,
	walletObject: any,
): Promise<void> => {
	const baseUrl = "https://walletobjects.googleapis.com/walletobjects/v1";

	try {
		// Try to fetch existing object
		await googleAuthClient.request({
			url: `${baseUrl}/genericObject/${objectId}`,
			method: "GET",
		});

		// Object exists, update it
		await googleAuthClient.request({
			url: `${baseUrl}/genericObject/${objectId}`,
			method: "PATCH",
			data: walletObject,
		});

		logInfo(`Wallet object updated successfully: ${objectId}`);
	} catch (error) {
		if (error instanceof AxiosError && error.response?.status === 404) {
			// Object doesn't exist, create it
			try {
				await googleAuthClient.request({
					url: `${baseUrl}/genericObject`,
					method: "POST",
					data: walletObject,
				});

				logInfo(`Wallet object created successfully: ${objectId}`);
			} catch (createError) {
				logError("Failed to create wallet object", createError);
				throw new HttpsError("internal", "Failed to create wallet pass");
			}
		} else {
			logError("Failed to fetch/update wallet object", error);
			throw new HttpsError("internal", "Failed to process wallet pass");
		}
	}
};

// Generate JWT token for Google Wallet (without expiration)
const generateWalletJWT = (
	config: GoogleWalletConfig,
	walletObject: any,
): string => {
	const claims = {
		iss: config.client_email,
		aud: "google",
		origins: [],
		typ: "savetowallet",
		payload: {
			genericObjects: [walletObject],
		},
		// Intentionally omitting 'exp' claim to make token non-expiring
		// Google Wallet tokens can be created without expiration for long-term storage
	};

	return jwt.sign(claims, config.private_key, {
		algorithm: "RS256",
	});
};

// Main Cloud Function
export const createPassObject = onCall(async (req) => {
	// Authentication check
	if (!req.auth) {
		throw new HttpsError("unauthenticated", "Authentication required");
	}

	const userId = req.auth.uid;
	const userEmail = req.auth.token.email || req.data?.email;

	if (!userEmail) {
		throw new HttpsError("invalid-argument", "User email is required");
	}

	try {
		// Load configuration
		const config = loadGoogleWalletConfig();
		const googleAuthClient = initializeGoogleAuth(config);

		// Get user information
		const { firstName, lastName, type } = await getUserInfo(userId);

		// Generate object IDs
		const objectId = `spurhacks-event-ticket.${userId}`;
		const classId = `${config.issuerid}.spurhacks-event-ticket`;

		// Create wallet object
		const walletObject = createWalletObject(
			objectId,
			classId,
			firstName,
			lastName,
			type,
			userEmail,
			"", // ticketId will be set after ticket creation
		);

		// Generate JWT token (non-expiring)
		const jwtToken = generateWalletJWT(config, walletObject);
		const saveUrl = `https://pay.google.com/gp/v/save/${jwtToken}`;

		// Create or update ticket with JWT stored
		const ticketId = await createOrUpdateTicket(
			userId,
			firstName,
			lastName,
			userEmail,
			type,
			objectId,
			saveUrl,
		);

		// Update wallet object with actual ticket ID for QR code
		walletObject.barcode.value = `${process.env.FE_URL}/ticket/${ticketId}`;

		// Handle Google Wallet API operations
		await handleWalletApiOperations(googleAuthClient, objectId, walletObject);

		// Update ticket with final wallet object (with correct QR code)
		const updatedJwtToken = generateWalletJWT(config, walletObject);
		const updatedSaveUrl = `https://pay.google.com/gp/v/save/${updatedJwtToken}`;

		await getFirestore().collection("tickets").doc(ticketId).update({
			googleSignedJWT: updatedSaveUrl,
			updatedAt: new Date(),
		});

		logInfo(`Pass object created/updated successfully for user ${userId}`);

		return {
			success: true,
			ticketId,
			url: updatedSaveUrl,
			message: "Event ticket generated successfully",
		};
	} catch (error) {
		logError("Error in createPassObject", error);

		if (error instanceof HttpsError) {
			throw error;
		}

		throw new HttpsError("internal", "Failed to generate event ticket");
	}
});
