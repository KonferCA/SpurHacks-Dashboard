import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import {
	log,
	error as logError,
	info as logInfo,
} from "firebase-functions/logger";
import * as functions from "firebase-functions/v1";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { Octokit } from "octokit";
import * as QRCode from "qrcode";
import { Resend } from "resend";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type { Context } from "./types";
import { HttpStatus, response } from "./utils";

initializeApp();

const FE_URL = process.env.FE_URL;

export const fetchOrGenerateTicket = onCall(async (_, res) => {
	const context = res as Context;
	if (!context || !context.auth) {
		throw new HttpsError(
			"permission-denied",
			"User must be authenticated to initiate this operation.",
		);
	}

	const userId = context.auth.uid;
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
			.where("userId", "==", context.auth.uid)
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

// Default on-sign-up Claims function
export const addDefaultClaims = functions.auth.user().onCreate(async (user) => {
	const { uid } = user;
	try {
		await getAuth().setCustomUserClaims(uid, {
			// Default Claims
			admin: false, // Example: set to true for admin users
			phoneVerified: false,
			rsvpVerified: false,
			type: "hacker",
		});
		logInfo(`Custom claims added for user: ${uid}`);
	} catch (error) {
		logError("Error adding custom claims:", error);
	}
});

// onCall Function to be called from Frontend for making user Admin
export const addAdminRole = onCall((data: any, res) => {
	const context = res as Context;
	// If user is not an Admin, decline request
	if (context?.auth?.token?.admin !== true) {
		return { error: "Only admins can add other admins" };
	}
	// Get USER and ADD custom claim (admin) based on Email
	return getAuth()
		.getUserByEmail(data.email)
		.then((user) => {
			return getAuth().setCustomUserClaims(user.uid, {
				admin: true,
			});
		})
		.then(() => {
			return {
				message: `Success! ${data.email} is now an Admin!`,
			};
		})
		.catch((err) => {
			return err;
		});
});

interface Socials {
	instagram: string;
	github: string;
	linkedin: string;
	discord: string;
	resumeRef: string;
	docId: string;
	uid: string;
	resumeVisibility: "Public" | "Private" | "Sponsors Only";
}

export const requestSocials = onCall(async (_, res) => {
	const context = res as Context;
	if (!context || !context.auth)
		return response(HttpStatus.UNAUTHORIZED, { message: "unauthorized" });

	const func = "requestSocials";

	logInfo("Getting socials...");
	let socials: Socials | undefined;
	try {
		const snap = await getFirestore()
			.collection("socials")
			.where("uid", "==", context.auth.uid)
			.get();
		socials = snap.docs[0]?.data() as Socials;
	} catch (e) {
		logError("Failed to get socials.", { error: e, func });
		return response(HttpStatus.INTERNAL_SERVER_ERROR, {
			message: "internal (get_socials) ",
		});
	}

	if (!socials) {
		// create a new socials document
		const app = (
			await getFirestore()
				.collection("applications")
				.where("applicantId", "==", context.auth.uid)
				.get()
		).docs[0]?.data();
		const docId = uuidv4();

		if (!app) {
			logInfo("Creating new socials with default values...");
			// create with default
			socials = {
				instagram: "",
				github: "",
				linkedin: "",
				discord: "",
				resumeRef: "",
				docId,
				uid: context.auth.uid,
				resumeVisibility: "Public",
			};
		} else {
			logInfo("Creating new socials with selected application values...");
			socials = {
				instagram: "",
				github: app.githubUrl ?? "",
				linkedin: app.linkedUrl ?? "",
				discord: app.discord,
				resumeRef:
					app.participatingAs === "Mentor"
						? app.mentorResumeRef
						: app.generalResumeRef,
				docId,
				uid: context.auth.uid,
				resumeVisibility: "Public",
			};
		}
		await getFirestore().collection("socials").doc(docId).set(socials);
		logInfo("Socials saved.");
	}

	return response(HttpStatus.OK, { message: "ok", data: socials });
});

export const updateSocials = onCall(async (data: any, res) => {
	const context = res as Context;
	if (!context || !context.auth) {
		logInfo("Authentication required.");
		throw new HttpsError("permission-denied", "Not authenticated");
	}

	logInfo("Updating socials:", data);
	logInfo("User ID in Func:", context.auth.uid);

	try {
		const doc = await getFirestore()
			.collection("socials")
			.doc(data.docId)
			.get();
		if (!doc.exists)
			return response(HttpStatus.NOT_FOUND, { message: "not found" });

		const socials = doc.data() as Socials;
		if (socials.uid !== context.auth.uid)
			return response(HttpStatus.UNAUTHORIZED, {
				message: "cannot update socials",
			});

		logInfo("Updating socials for application:", doc.id);
		logInfo("Data in ref:", doc);

		const db = getFirestore();
		db.settings({ ignoreUndefinedProperties: true });
		await db.collection("socials").doc(doc.id).update({
			instagram: data.instagram,
			linkedin: data.linkedin,
			github: data.github,
			discord: data.discord,
			resumeRef: data.resumeRef,
			resumeVisibility: data.resumeVisibility,
		});
		logInfo("Socials updated:", data);
		return response(HttpStatus.OK, { message: "ok" });
	} catch (error) {
		logError("Failed to update socials", { error });
		throw new HttpsError("internal", "Failed to update socials", error);
	}
});

/**
 * This cloud function is use as a solution to the work around
 * when signing in with github would lead to unverified email
 * even if the email has actually been verified with github
 *
 * Calls the REST API with octokit to get all the emails the user
 * has with github and match it with the email we have with firebase auth
 *
 * refer the link below for more information
 * https://docs.github.com/en/rest/users/emails?apiVersion=2022-11-28#list-email-addresses-for-the-authenticated-user
 *
 * Sends back true/false of verification status
 */
export const verifyGitHubEmail = onCall(async (data: any, res) => {
	const context = res as Context;
	if (!context || !context.auth) {
		return new HttpsError("permission-denied", "Not authenticated");
	}

	const { token, email } = data;

	if (!token || !email) {
		return new HttpsError("failed-precondition", "Invalid Payload");
	}

	try {
		const octokit = new Octokit({
			auth: token,
		});

		const res = await octokit.request("GET /user/emails", {
			headers: {
				"X-GitHub-Api-Version": "2022-11-28",
			},
		});

		if (res.status === 200) {
			const payloadEmail = res.data.filter((data) => data.email === email)[0];
			if (!payloadEmail)
				return new HttpsError("aborted", "Fail to match email in payload");

			// since we got the email data we need, we check if its verified
			getAuth().updateUser(context.auth.uid, {
				emailVerified: payloadEmail.verified,
			});
			return payloadEmail.verified;
		}
		return new HttpsError("unavailable", "Service unavailable");
	} catch {
		return new HttpsError("internal", "Failed to verify email");
	}
});

export const logEvent = onCall((data: any, res) => {
	const context = res as Context;

	const uid = context?.auth?.uid;

	const payloadValidation = z.object({
		type: z.string().refine((val) => ["error", "info", "log"].includes(val)),
		data: z.any(),
	});

	const result = payloadValidation.safeParse(data);
	if (!result.success) logInfo("Invalid log payload");
	else {
		switch (result.data.type) {
			case "error":
				logError({ data: result.data.data, uid });
				break;
			case "info":
				logInfo({ data: result.data.data, uid });
				break;
			default:
				log({ data: result.data.data, uid });
				break;
		}
	}
});

async function internalGetTicketData(id: string, extended = false) {
	logInfo("Checking for ticket data...");
	const ticketDoc = await getFirestore().collection("tickets").doc(id).get();
	if (!ticketDoc.exists) {
		return response(HttpStatus.NOT_FOUND, { message: "not found" });
	}

	const ticket = ticketDoc.data() as {
		userId: string;
		foods: string[];
		events: string[];
	};

	logInfo("Checking for application data...");
	const app = (
		await getFirestore()
			.collection("applications")
			.where("applicantId", "==", ticket.userId)
			.get()
	).docs[0]?.data();
	let firstName = "";
	let lastName = "";
	let pronouns = "";
	let discord = "";
	let linkedin = "";
	let github = "";
	let resumeRef = "";
	let allergies: string[] = [];

	if (!app) {
		// grab from user record
		logInfo("No application data, taking name from user record.");
		const user = await getAuth().getUser(ticket.userId);
		const parts = user.displayName?.split(" ") ?? ["", ""];
		firstName = parts[0];
		lastName = parts[1];
	} else {
		firstName = app.firstName;
		lastName = app.lastName;
		pronouns = app.pronouns;
		discord = app.discord ?? "";
		linkedin = app.linkedinUrl ?? "";
		github = app.githubUrl ?? "";
		resumeRef =
			app.participatingAs === "Mentor"
				? app.mentorResumeRef
				: app.generalResumeRef;
		allergies = app.allergies ?? [];
	}

	// get social ticket
	logInfo("Checking for social data...");
	let socials = (
		await getFirestore()
			.collection("socials")
			.where("uid", "==", ticket.userId)
			.get()
	).docs[0]?.data();
	if (!socials) {
		logInfo("No socials found, using default data...");
		socials = {
			instagram: "",
			linkedin: linkedin ?? "",
			github: github ?? "",
			discord: discord ?? "",
			resumeRef: resumeRef ?? "",
			docId: "",
			resumeVisibility: "Public",
		} as Socials;
	}

	const data = {
		firstName,
		lastName,
		pronouns,
		foods: [] as string[],
		events: [] as string[],
		allergies,
		...socials,
	};

	if (extended) {
		data.foods = ticket.foods;
		data.events = ticket.events;
	}

	return data;
}

export const getTicketData = onCall(async (data: any) => {
	if (!z.string().uuid().safeParse(data.id).success) {
		return response(HttpStatus.BAD_REQUEST, { message: "bad request" });
	}

	try {
		const ticketData = await internalGetTicketData(data.id);
		return response(HttpStatus.OK, {
			message: "ok",
			data: ticketData,
		});
	} catch (e) {
		logError("Failed to get ticket data.", { error: e });
		return response(HttpStatus.INTERNAL_SERVER_ERROR, {
			message: "internal error",
		});
	}
});

export const getExtendedTicketData = onCall(async (data: any) => {
	if (!z.string().uuid().safeParse(data.id).success) {
		return response(HttpStatus.BAD_REQUEST, { message: "bad request" });
	}

	try {
		const ticketData = await internalGetTicketData(data.id, true);

		return response(HttpStatus.OK, {
			message: "ok",
			data: ticketData,
		});
	} catch (e) {
		logError("Failed to get extended ticket data.", {
			error: e,
		});
		return response(HttpStatus.INTERNAL_SERVER_ERROR, {
			message: "internal error",
		});
	}
});

export const redeemItem = onCall(async (data: any, res) => {
	const context = res as Context;
	if (!context || !context.auth)
		return response(HttpStatus.UNAUTHORIZED, { message: "unauthorized" });

	const user = await getAuth().getUser(context.auth.uid);
	if (!user.customClaims?.admin)
		return response(HttpStatus.UNAUTHORIZED, { message: "unauthorized" });

	const validateResults = z
		.object({
			ticketId: z.string(),
			itemId: z.string(),
			action: z.string().refine((v) => v === "check" || "uncheck"),
		})
		.safeParse(data);
	if (!validateResults.success) {
		logError("Bad request", {
			issues: validateResults.error.issues.map((i) => i.path),
		});
		return response(HttpStatus.BAD_REQUEST, { message: "bad request" });
	}

	const ticket = (
		await getFirestore().collection("tickets").doc(data.ticketId).get()
	).data();
	if (!ticket)
		return response(HttpStatus.NOT_FOUND, { message: "ticket not found" });

	let events = [];
	if (data.action === "check") {
		events = [...ticket.events, data.itemId];
		await getFirestore()
			.collection("tickets")
			.doc(data.ticketId)
			.update({ events });
	} else {
		events = ticket.events.filter((evt: string) => evt !== data.itemId);
		await getFirestore()
			.collection("tickets")
			.doc(data.ticketId)
			.update({ events });
	}

	return response(HttpStatus.OK, { data: events });
});

export const applicationCreated = onDocumentCreated(
	"applications/{docId}",
	async (evt) => {
		const resendKey = process.env.RESEND_KEY;
		const noreply = process.env.EMAIL_NOREPLY as string;
		if (!resendKey || !noreply) {
			logError({
				message:
					"Post submission not sent as not all required environment variables are set.",
				RESEND_KEY: !!resendKey,
				EMAIL_NOREPLY: !!noreply,
			});
			return;
		}

		const email = evt.data?.get("email");
		if (!email) {
			logError({
				message: `Post submission email not sent: Applicaiton with ID "${evt.params.docId}" had no email value in it.`,
			});
			return;
		}
		const resend = new Resend(resendKey);

		const applicationEmail = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet">
  <title>SpurHacks Application Received</title>
  <style>
    body {
      font-family: 'Geist', sans-serif;
      margin: 0;
      padding: 0;
      color: #DEEBFF;
      background: url('${FE_URL}/emailApplicationBackground.png') no-repeat center center/cover;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: start;
      text-align: left;
      position: relative;
    }

    .container {
      padding: 4rem;
      border-radius: 1rem;
      max-width: 400px;
      width: 90%;
    }

    .logo {
      max-width: 180px;
      margin: 0 auto;
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 3rem;
      letter-spacing: -1.5px;
    }

    h1 span {
      display: block;
    }

    .message {
      font-size: 1rem;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }

    .social {
      margin-top: 3rem;
    }

    .social-icon {
      margin-top: 1rem;
      display: flex;
      gap: 10px;
    }

    .social-icon a {
      text-decoration: none;
    }

    .social-icon img {
      width: 1.2rem;
      height: 1.2rem;
    }

    .footer {
      position: absolute;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.75rem;
      opacity: 0.7;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">

      <img src="${FE_URL}/spurhacks-full-logo-white.png" alt="SpurHacks Logo" class="logo" />
  
      <h1>
        <span>We’ve received</span>
        <span>your application! 💌</span>
      </h1>
  
      <div class="message">
        <strong>Thanks for applying to SpurHacks 2025!</strong><br /><br />
        This email is a confirmation that your application submission was successful. Sit tight—you can expect a status update <strong>early June.</strong><br /><br />
        If you highlighted travel accommodations or reimbursements in your application, we’ll be sure to contact you with further details.
      </div>
  
      <div class="social">
        In the meantime, stay updated with the latest news on our socials:
        <div class="social-icon">
          <a href="https://www.instagram.com/spurhacks">
              <img src="${FE_URL}/socialIcons/instagram.png" alt="Instagram" />
          </a>
          <a href="https://www.linkedin.com/company/spurhacks">
            <img src="${FE_URL}/socialIcons/linkedin.png" alt="LinkedIn" />
          </a>
          <a href="https://discord.spurhacks.com">
              <img src="${FE_URL}/socialIcons/discord.png" alt="Discord" />
          </a>
          <a href="https://www.tiktok.com/@spur_hacks">
              <img src="${FE_URL}/socialIcons/tiktok.png" alt="TikTok" />
          </a>
        </div>
      </div>

    <div class="footer">© 2025 SPUR Innovation. All rights reserved</div>
  </div>
</body>
</html>`;
		try {
			const sent = await resend.emails.send({
				from: noreply,
				to: [email],
				subject: "Thanks for apply to SpurHacks 2025!",
				html: applicationEmail,
			});
			log({
				message: "Post submission email sent",
				sent,
			});
		} catch (error) {
			logError({
				message: "Failed to send post submission email.",
				error,
			});
		}
	},
);

export {
	isTeamNameAvailable,
	createTeam,
	getTeamByUser,
	inviteMember,
	updateTeamName,
	removeMembers,
	deleteTeam,
	validateTeamInvitation,
	rejectInvitation,
	checkInvitation,
	getUserInvitations,
} from "./teams";

export { createTicket } from "./apple";

export { createPassClass, createPassObject } from "./google";

export {
	verifyRSVP,
	withdrawRSVP,
	joinWaitlist,
	// expiredSpotCleanup,
	// moveToSpots,
} from "./rsvp";
