import { getAuth } from "firebase-admin/auth";
import type { UserRecord } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { error as logError, info as logInfo } from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { Resend } from "resend";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { HttpStatus, response } from "./utils";

// Define interfaces for request data types
interface TeamNameRequest {
	name: string;
}

interface EmailsRequest {
	emails: string[];
}

interface CodeRequest {
	code: string;
}

type InvitationStatus = "pending" | "rejected" | "accepted";

// return schema to client
interface MemberData {
	firstName: string;
	lastName: string;
	email: string;
	status: InvitationStatus;
}

// return schema to client
interface TeamData {
	id: string;
	teamName: string;
	members: MemberData[];
	isOwner: boolean;
	ownerEmail: string; // email of the team owner
}

// private schema for internal use
interface Team {
	id: string;
	name: string;
	owner: string;
	createdAt: Timestamp;
}

interface Invitation {
	invitationId: string;
	status: InvitationStatus;
	userId: string;
	teamId: string;
	invitationSentAt: Timestamp;
	resendEmailId: string; // this is for checking the email that was sent in resend.com
	firstName: string;
	lastName: string;
	email: string;
}

interface UserProfile {
	firstName: string;
	lastName: string;
	email: string;
	teamId: string;
	uid: string;
}

const RESEND_API_KEY = process.env.RESEND_KEY;
const NOREPLY_EMAIL = process.env.EMAIL_NOREPLY;
const FE_URL = process.env.FE_URL;
const APP_ENV = process.env.APP_ENV;
const TEAMS_COLLECTION = "teams";
const USER_PROFILES_COLLECTION = "user-profiles";
const INVITATIONS_COLLECTION = "invitations";

async function internalSearchTeam(name: string): Promise<Team | undefined> {
	const snap = await getFirestore()
		.collection(TEAMS_COLLECTION)
		.where("name", "==", name)
		.get();
	return snap.docs[0]?.data() as Team;
}

async function internalGetTeamByUser(uid: string): Promise<Team | undefined> {
	// get the user profile
	const profileSnap = await getFirestore()
		.collection(USER_PROFILES_COLLECTION)
		.where("uid", "==", uid)
		.where("teamId", "!=", "")
		.get();
	const profile = profileSnap.docs[0]?.data() as UserProfile | undefined;
	if (!profile || !profile.teamId) {
		return;
	}

	// have to get the team first
	const snap = await getFirestore()
		.collection(TEAMS_COLLECTION)
		.doc(profile.teamId)
		.get();

	if (!snap.exists) {
		return;
	}

	return snap.data() as Team | undefined;
}

async function internalGetMembersByTeam(teamId: string): Promise<MemberData[]> {
	const snap = await getFirestore()
		.collection(USER_PROFILES_COLLECTION)
		.where("teamId", "==", teamId)
		.get();
	const members: MemberData[] = [];
	snap.forEach((doc) => {
		const data = doc.data() as UserProfile;
		// to get the status, we need to
		members.push({
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email,
			status: "accepted", // everyone who is in the team already must have accepted the team invitation
		});
	});
	return members;
}

/**
 * This function differs from `internalGetMembersByTeam` because it gets the potential team members
 * based on invitations sent to join the given team.
 */
async function internalGetInvitedMembersByTeam(
	teamId: string,
): Promise<MemberData[]> {
	const snap = await getFirestore()
		.collection(INVITATIONS_COLLECTION)
		.where("teamId", "==", teamId)
		.where("status", "==", "pending")
		.get();
	const members: MemberData[] = [];
	snap.forEach((doc) => {
		const data = doc.data() as Invitation;
		members.push({
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email,
			status: data.status,
		});
	});
	return members;
}

/**
 * Searches if team name is available or not
 */
export const isTeamNameAvailable = onCall<TeamNameRequest>(async (req) => {
	if (!req.auth) {
		return response(HttpStatus.UNAUTHORIZED, {
			message: "Unauthorized",
		});
	}

	if (!req.data.name || !z.string().min(1).safeParse(req.data.name).success) {
		return response(HttpStatus.BAD_REQUEST, {
			message: "Invalid payload.",
		});
	}

	const func = "isTeamNameAvailable";

	// search team
	try {
		logInfo("Searching for team with given name", req.data.name, { func });
		const team = await internalSearchTeam(req.data.name);
		// team name is available if no team was found
		return response(HttpStatus.OK, { data: team === undefined });
	} catch (e) {
		logError("Failed to find if team name is available or not.", {
			error: e,
			func,
		});
		return response(HttpStatus.INTERNAL_SERVER_ERROR, {
			message: "Servide down 1201",
		});
	}
});

/**
 * Creates a new team and adds the requesting user to the team doc
 */
export const createTeam = onCall<TeamNameRequest>(async (req) => {
	if (!req.auth) {
		return response(HttpStatus.UNAUTHORIZED, {
			message: "Unauthorized",
		});
	}

	if (process.env.TEAMS_ALLOW_CREATE_TEAM !== "true") {
		return response(HttpStatus.BAD_REQUEST, {
			message: "Team creation is not available.",
		});
	}

	if (!z.string().min(1).safeParse(req.data.name).success) {
		return response(HttpStatus.BAD_REQUEST, {
			message: "Invalid payload.",
		});
	}

	const func = "createTeam";

	let firstName = "";
	let lastName = "";
	try {
		logInfo("Checking if user has been accepted or not", {
			func,
		});
		const snap = await getFirestore()
			.collection("applications")
			.where("applicantId", "==", req.auth.uid)
			.where("applicationStatus", "==", "accepted")
			.get();
		if (snap.size < 1) {
			// user either did not apply or not accepted
			logInfo("Requesting user either did not apply or not accepted", {
				func,
			});
			return response(HttpStatus.BAD_REQUEST, {
				message: "Not accepted into the hackathon.",
			});
		}

		const data = snap.docs[0].data();
		firstName = data.firstName;
		lastName = data.lastName;
	} catch (error) {
		logError("Failed to check if user has been accepted", {
			error,
			func,
		});
		return response(HttpStatus.INTERNAL_SERVER_ERROR, {
			message: "Service down 1205",
		});
	}

	try {
		logInfo("User has been accepted into the hackathon", {
			func,
			uid: req.auth.uid,
		});
		const userAlreadyInTeam = await internalGetTeamByUser(req.auth.uid);
		if (userAlreadyInTeam) {
			logInfo("User already in a team", { func, uid: req.auth.uid });
			return response(HttpStatus.BAD_REQUEST, {
				message: "Already in a team",
			});
		}

		logInfo("Searching for team with given name", req.data.name, { func });
		const team = await internalSearchTeam(req.data.name);
		if (team) {
			logInfo("Team name not available", req.data.name, { func });
			return response(HttpStatus.BAD_REQUEST, {
				message: "Team name not available",
			});
		}

		const teamId = uuidv4();

		logInfo("Creating team document", { func });
		// create the team doc
		await getFirestore()
			.collection(TEAMS_COLLECTION)
			.doc(teamId)
			.set({
				name: req.data.name,
				owner: req.auth.uid,
				id: teamId,
				createdAt: Timestamp.now(),
			});

		logInfo("Updating user profile", { func, uid: req.auth.uid });
		const profileSnap = await getFirestore()
			.collection(USER_PROFILES_COLLECTION)
			.where("uid", "==", req.auth.uid)
			.get();
		if (profileSnap.empty) {
			// create a new profile for the user
			await getFirestore()
				.collection(USER_PROFILES_COLLECTION)
				.doc(req.auth.uid)
				.set({
					uid: req.auth.uid,
					firstName,
					lastName,
					email: req.auth.token.email,
					teamId,
				});
		} else {
			// update teamId for the user
			await getFirestore()
				.collection(USER_PROFILES_COLLECTION)
				.doc(profileSnap.docs[0].id)
				.update({ teamId });
		}

		return response(HttpStatus.OK, {
			message: "Team created.",
			data: { id: teamId, teamName: req.data.name },
		});
	} catch (e) {
		logError("Failed to create team", { error: e, func });
		return response(HttpStatus.INTERNAL_SERVER_ERROR, {
			message: "Service down 1202",
		});
	}
});

/**
 * Gets the team that the requesting user belongs to
 */
export const getTeam = onCall(async (req) => {
	if (!req.auth) {
		return response(HttpStatus.UNAUTHORIZED, {
			message: "Unauthorized",
		});
	}

	const func = "getTeam";

	try {
		logInfo("Getting user's team", { func, uid: req.auth.uid });
		const team = await internalGetTeamByUser(req.auth.uid);
		if (team === undefined) {
			// a user may not have a team -- this is not an error
			return response(HttpStatus.OK, {
				data: null,
			});
		}

		logInfo("Getting members from team.", { func, teamId: team.id });
		const members = await internalGetMembersByTeam(team.id);

		logInfo("Getting invited members from team.", { func, teamId: team.id });
		const invitedMembers = await internalGetInvitedMembersByTeam(team.id);
		members.push(...invitedMembers);

		// get owner's email
		logInfo("Getting owner details.", { func, ownerId: team.owner });
		const ownerSnap = await getFirestore()
			.collection(USER_PROFILES_COLLECTION)
			.where("uid", "==", team.owner)
			.get();
		const ownerData = ownerSnap.docs[0]?.data() as UserProfile;
		const ownerEmail = ownerData?.email ?? "";

		const data: TeamData = {
			id: team.id,
			teamName: team.name,
			members,
			isOwner: team.owner === req.auth.uid,
			ownerEmail,
		};
		return response(HttpStatus.OK, {
			data,
		});
	} catch (e) {
		logError("Failed to get user's team", { error: e, func });
		return response(HttpStatus.INTERNAL_SERVER_ERROR, {
			message: "Service down 1203",
		});
	}
});

/**
 * Sends an email invitation
 */
export const inviteMember = onCall<EmailsRequest>(async (req) => {
	if (!req.auth) {
		return response(HttpStatus.UNAUTHORIZED, {
			message: "Unauthorized",
		});
	}

	if (
		!req.data.emails ||
		!z.array(z.string().email()).safeParse(req.data.emails).success
	) {
		return response(HttpStatus.BAD_REQUEST, {
			message: "Invalid payload.",
		});
	}

	const func = "inviteMember";
	const uid = req.auth.uid;

	try {
		logInfo("Getting user's team", { func, uid });
		const team = await internalGetTeamByUser(uid);
		if (team === undefined) {
			logInfo("User does not have a team", { func, uid });
			return response(HttpStatus.BAD_REQUEST, {
				message: "Not in a team",
			});
		}

		// check if user is owner of team
		if (team.owner !== uid) {
			logInfo("User is not the owner of the team", { func, uid });
			return response(HttpStatus.UNAUTHORIZED, {
				message: "Unauthorized",
			});
		}

		const members = await internalGetMembersByTeam(team.id);
		if (members.length + req.data.emails.length > 4) {
			logInfo("Team size cannot exceed 4 members", { func, uid });
			return response(HttpStatus.BAD_REQUEST, {
				message: "Team size cannot exceed 4 members",
			});
		}

		// check if invited members are already in a team
		const firestore = getFirestore();
		for (const email of req.data.emails) {
			const userSnap = await firestore
				.collection(USER_PROFILES_COLLECTION)
				.where("email", "==", email)
				.where("teamId", "!=", "")
				.get();
			if (userSnap.docs.length > 0) {
				const user = userSnap.docs[0].data() as UserProfile;
				logInfo("User already in a team", { func, email: user.email });
				return response(HttpStatus.BAD_REQUEST, {
					message: `${user.firstName} is already in a team.`,
				});
			}
		}

		// check if invited members are already invited
		for (const email of req.data.emails) {
			const invitationSnap = await firestore
				.collection(INVITATIONS_COLLECTION)
				.where("email", "==", email)
				.where("teamId", "==", team.id)
				.where("status", "==", "pending")
				.get();
			if (invitationSnap.docs.length > 0) {
				logInfo("User already invited to team", { func, email });
				return response(HttpStatus.BAD_REQUEST, {
					message: `${email} is already invited to this team.`,
				});
			}
		}

		// check if user has been accepted into the hackathon
		let hasBeenAccepted = false;
		let userRecord: UserRecord | undefined = undefined;
		let firstName = "";
		let lastName = "";
		for (const email of req.data.emails) {
			try {
				userRecord = await getAuth().getUserByEmail(email);
				const snap = await firestore
					.collection("applications")
					.where("applicantId", "==", userRecord.uid)
					.where("applicationStatus", "==", "accepted")
					.get();
				if (snap.size > 0) {
					hasBeenAccepted = true;
					const data = snap.docs[0].data();
					firstName = data.firstName;
					lastName = data.lastName;
				}
			} catch (e) {
				logError("User does not exist in auth?", { func, email });
			}

			if (!hasBeenAccepted) {
				logInfo("User has not been accepted into the hackathon", {
					func,
					email,
				});
				return response(HttpStatus.BAD_REQUEST, {
					message: `User with email '${email}' has not been accepted into the hackathon.`,
				});
			}
		}

		const resend = new Resend(RESEND_API_KEY);
		for (const email of req.data.emails) {
			logInfo("Creating invitation document.", { func, email });
			const invitationId = uuidv4();

			const { data: sent, error: sentError } = await resend.emails.send({
				from: `SpurHacks <${NOREPLY_EMAIL}>`,
				to: APP_ENV !== "prod" ? "delivered@resend.dev" : email,
				subject: "You have been invited to join a team for SpurHacks",
				html: `<p>Click <a href="${FE_URL}/team/invitations?code=${invitationId}">here</a> to join team ${team.name}.</p>`,
			});

			if (sentError) {
				logError("Failed to send email.", {
					func,
					error: sentError,
					teamId: team.id,
				});
				return response(HttpStatus.INTERNAL_SERVER_ERROR, {
					message: "Failed to send email. Service down 1205",
				});
			}

			logInfo("Invitation email sent.", {
				func,
				email,
				teamId: team.id,
				invitationId,
			});

			await firestore.collection(INVITATIONS_COLLECTION).doc(invitationId).set({
				invitationId,
				status: "pending",
				userId: userRecord?.uid ?? "",
				teamId: team.id,
				invitationSentAt: Timestamp.now(),
				resendEmailId: sent?.id ?? "",
				email,
				firstName,
				lastName,
			});
		}

		return response(HttpStatus.OK, {
			message: "Invitations sent.",
		});
	} catch (e) {
		logError("Failed to invite member", { error: e, func });
		return response(HttpStatus.INTERNAL_SERVER_ERROR, {
			message: "Service down 1204",
		});
	}
});

/**
 * Updates the name for the requesting user's team
 * The requesting user must be the owner
 */
export const updateTeamName = onCall<TeamNameRequest>(async (req) => {
	if (!req.auth) {
		return response(HttpStatus.UNAUTHORIZED, {
			message: "Unauthorized",
		});
	}

	if (process.env.TEAMS_ALLOW_UPDATE_TEAM_NAME !== "true") {
		return response(HttpStatus.BAD_REQUEST, {
			message: "Team name update is not available.",
		});
	}

	if (!req.data.name || !z.string().min(1).safeParse(req.data.name).success) {
		return response(HttpStatus.BAD_REQUEST, {
			message: "Invalid payload",
		});
	}

	const func = "updateTeamName";

	// find the team the requesting user owns and update name
	try {
		logInfo("Getting team requesting user owns", { func });
		const snap = await getFirestore()
			.collection(TEAMS_COLLECTION)
			.where("owner", "==", req.auth.uid)
			.get();
		const team = snap.docs[0]?.data() as Team | undefined;
		if (!team) {
			logInfo("Requesting user's team not found", { func });
			return response(HttpStatus.NOT_FOUND, {
				message: "Failed to find team.",
			});
		}
		logInfo("Found requesting user's team", { func });
		logInfo("Updating team's name...", { func });
		await getFirestore()
			.collection(TEAMS_COLLECTION)
			.doc(team.id)
			.update({ name: req.data.name });
		logInfo("Team name updated!", { func });
	} catch (error) {
		logError("Failed to get team for requesting user.", {
			func,
			error,
		});
		return response(HttpStatus.INTERNAL_SERVER_ERROR, {
			message: "Failed to changed team name (1).",
		});
	}

	return response(HttpStatus.OK, { message: "Team name updated!" });
});

/**
 * Remove the members given in the payload as long as the requesting user is owner of
 * a team. It will just remove the members from the team the user owns to avoid others messing up
 * with other teams.
 */
export const removeMembers = onCall<EmailsRequest>(async (req) => {
	if (!req.auth) {
		return response(HttpStatus.UNAUTHORIZED, {
			message: "Unauthorized",
		});
	}

	if (process.env.TEAMS_ALLOW_REMOVE_MEMBERS !== "true") {
		return response(HttpStatus.BAD_REQUEST, {
			message: "Remove members not available.",
		});
	}

	if (!z.string().email().array().min(1).safeParse(req.data.emails).success) {
		return response(HttpStatus.BAD_REQUEST, {
			message: "Invalid payload",
		});
	}

	const func = "removeMembers";

	// find the team the requesting user owns and update members
	try {
		logInfo("Getting team that requesting user owns", {
			func,
		});
		const snap = await getFirestore()
			.collection(TEAMS_COLLECTION)
			.where("owner", "==", req.auth.uid)
			.get();
		const team = snap.docs[0]?.data() as Team | undefined;
		if (!team) {
			logInfo("Team not found", { func });
			return response(HttpStatus.NOT_FOUND, {
				message: "Team not found.",
			});
		}
		logInfo("Found team requesting user owns.", { func });

		// now we need to remove any document form team-members collection that are in the given team
		// and it matches any email in the payload
		const deleteSnap = await getFirestore()
			.collection(USER_PROFILES_COLLECTION)
			.where("email", "in", req.data.emails)
			.where("teamId", "==", team.id)
			.get();
		const batch = getFirestore().batch();
		deleteSnap.forEach((doc) => {
			batch.update(doc.ref, { teamId: "" });
		});

		// delete any invitation sent to the members
		const invitationSnap = await getFirestore()
			.collection(INVITATIONS_COLLECTION)
			.where("email", "in", req.data.emails)
			.where("teamId", "==", team.id)
			.get();
		invitationSnap.forEach((doc) => {
			logInfo("invitation:", doc.id);
			batch.delete(doc.ref);
		});

		await batch.commit();
	} catch (error) {
		logError("Failed to get team that requesting user owns.", { func });
		return response(HttpStatus.INTERNAL_SERVER_ERROR, {
			message: "Failed to remove members (1).",
		});
	}

	return response(HttpStatus.OK);
});

/**
 * Delete the team the requesting user owns.
 */
export const deleteTeam = onCall(async (req) => {
	if (!req.auth) {
		return response(HttpStatus.UNAUTHORIZED, {
			message: "Unauthorized",
		});
	}

	if (process.env.TEAMS_ALLOW_DELETE_TEAM !== "true") {
		return response(HttpStatus.BAD_REQUEST, {
			message: "Team deletion not available.",
		});
	}

	const func = "deleteTeam";

	// delete team if requesting user owns one
	try {
		logInfo("Deleting team...", { func });
		const snap = await getFirestore()
			.collection(TEAMS_COLLECTION)
			.where("owner", "==", req.auth.uid)
			.get();
		const team = snap.docs[0]?.data() as Team | undefined;
		if (!team) {
			logInfo("No team found to delete.", { func });
			return response(HttpStatus.NOT_FOUND, {
				message: "Team not found.",
			});
		}
		// make a batch write request to delete team and all team members in the given team
		const memberSnap = await getFirestore()
			.collection(USER_PROFILES_COLLECTION)
			.where("teamId", "==", team.id)
			.get();
		const batch = getFirestore().batch();
		memberSnap.forEach((m) => {
			// update the user profile to not have the team id
			batch.update(m.ref, { teamId: "" });
		});

		// delete any outstanding invitations for this team
		logInfo("Deleting outstanding invitations for team...", { func, teamId: team.id });
		const invitationSnap = await getFirestore()
			.collection(INVITATIONS_COLLECTION)
			.where("teamId", "==", team.id)
			.get();
		invitationSnap.forEach((doc) => {
			logInfo("Deleting invitation:", { func, invitationId: doc.id });
			batch.delete(doc.ref);
		});

		// delete team
		batch.delete(snap.docs[0].ref);
		// commit
		await batch.commit();
	} catch (error) {
		logError("Failed to delete team.", { func, error });
		return response(HttpStatus.INTERNAL_SERVER_ERROR, {
			message: "Failed to delete team (1).",
		});
	}

	return response(HttpStatus.OK, { message: "Team deleted" });
});

/**
 * Validates the invitation and set the status in team-members collection for the given user to "accepted"
 */
export const validateTeamInvitation = onCall<CodeRequest>(async (req) => {
	if (!req.auth) {
		return response(HttpStatus.UNAUTHORIZED, {
			message: "Unathorized",
		});
	}

	if (!z.string().uuid().safeParse(req.data.code).success) {
		return response(HttpStatus.BAD_REQUEST, {
			message: "Invalid payload",
		});
	}

	const func = "validateTeamInvitation";

	// check if invitation code is for the given user
	let invitation: Invitation | undefined;
	try {
		logInfo("Checking if invitation is for requesting user", { func });
		let snap = await getFirestore()
			.collection(INVITATIONS_COLLECTION)
			.where("invitationId", "==", req.data.code)
			.where("userId", "==", req.auth.uid)
			.where("status", "==", "pending")
			.get();
		invitation = snap.docs[0]?.data() as Invitation;
		if (!invitation) {
			logInfo(
				"Requesting user is not the user the invitation is meant for. Do not add user to team.",
				{ func },
			);
			return response(HttpStatus.BAD_REQUEST, {
				message: "Invitation does not exists or expired.",
			});
		}

		// make sure we only add someone who is not in a team
		snap = await getFirestore()
			.collection(USER_PROFILES_COLLECTION)
			.where("uid", "==", req.auth.uid)
			.where("teamId", "!=", "")
			.get();
		if (snap.size > 0) {
			logInfo("Requesting user belongs to a team already.", { func });
			return response(HttpStatus.BAD_REQUEST, {
				message: "Invitation does not exists or expired.",
			});
		}

		// if we found a member, then it is for the requesting user
		// now we update the status of the member
		logInfo("Updating invitation status", { func });
		await getFirestore()
			.collection(INVITATIONS_COLLECTION)
			.doc(req.data.code)
			.update({ status: "accepted" });
		logInfo("Invitation status updated.", { func });
	} catch (error) {
		logError("Failed to check if invitation is for requesting user", {
			func,
			error,
		});
		return response(HttpStatus.INTERNAL_SERVER_ERROR, {
			message: "Failed to join team. (2)",
		});
	}

	// update user profile
	try {
		logInfo("Checking if requesting user has a profile...", { func });
		const snap = await getFirestore()
			.collection(USER_PROFILES_COLLECTION)
			.where("uid", "==", req.auth.uid)
			.get();
		if (!snap.docs[0]) {
			logInfo("Requesting user has no profile, creating...", {
				func,
			});
			await getFirestore()
				.collection(USER_PROFILES_COLLECTION)
				.add({
					firstName: invitation.firstName,
					lastName: invitation.lastName,
					email: invitation.email,
					teamId: invitation.teamId,
					uid: req.auth.uid,
				} as UserProfile);
		} else {
			logInfo("Found user profile, updating teamId...", { func });
			await getFirestore()
				.collection(USER_PROFILES_COLLECTION)
				.doc(snap.docs[0].id)
				.update({ teamId: invitation.teamId });
		}
	} catch (error) {
		logError("Failed to update user profile", {
			func,
			error,
		});
		return response(HttpStatus.INTERNAL_SERVER_ERROR, {
			message: "Failed to join team.",
		});
	}

	return response(HttpStatus.OK, { message: "Joined team." });
});

/**
 * Reject an invitation if the invitation is for the requesting user
 */
export const rejectInvitation = onCall<CodeRequest>(async (req) => {
	if (!req.auth) {
		return response(HttpStatus.UNAUTHORIZED, {
			message: "Unathorized",
		});
	}

	if (!z.string().uuid().safeParse(req.data.code).success) {
		return response(HttpStatus.BAD_REQUEST, {
			message: "Invalid payload",
		});
	}

	const func = "rejectInvitation";

	// check if invitation code is for the given user
	let invitation: Invitation | undefined;
	try {
		logInfo("Checking if invitation is for requesting user", { func });
		const snap = await getFirestore()
			.collection(INVITATIONS_COLLECTION)
			.where("invitationId", "==", req.data.code)
			.where("userId", "==", req.auth.uid)
			.where("status", "==", "pending")
			.get();
		invitation = snap.docs[0]?.data() as Invitation;
		if (!invitation) {
			logInfo(
				"Requesting user is not the user the invitation is meant for. Do not add user to team.",
				{ func },
			);
			return response(HttpStatus.BAD_REQUEST, {
				message: "Invitation does not exists or expired.",
			});
		}
		// if we found a member, then it is for the requesting user
		// now we update the status of the member
		logInfo("Updating invitation status", { func });
		await getFirestore()
			.collection(INVITATIONS_COLLECTION)
			.doc(req.data.code)
			.update({ status: "rejected" });
		logInfo("Invitation status updated.", { func });
	} catch (error) {
		logError("Failed to check if invitation is for requesting user", {
			func,
			error,
		});
		return response(HttpStatus.INTERNAL_SERVER_ERROR, {
			message: "Failed to reject invitation. (2)",
		});
	}

	return response(HttpStatus.OK, { message: "Invitation rejected." });
});

export const checkInvitation = onCall<CodeRequest>(async (req) => {
	if (!req.auth) {
		return response(HttpStatus.UNAUTHORIZED, {
			message: "Unauthorized",
		});
	}

	if (!z.string().uuid().safeParse(req.data.code).success) {
		return response(HttpStatus.BAD_REQUEST, { message: "Bad Request" });
	}

	try {
		const snap = await getFirestore()
			.collection(INVITATIONS_COLLECTION)
			.where("invitationId", "==", req.data.code)
			.where("userId", "==", req.auth.uid)
			.where("status", "==", "pending")
			.get();
		const doc = snap.docs[0];
		if (!doc) {
			return response(HttpStatus.NOT_FOUND, { message: "Not Found" });
		}

		// make sure requesting user is not in a team already
		const profileDoc = (
			await getFirestore()
				.collection(USER_PROFILES_COLLECTION)
				.where("uid", "==", req.auth.uid)
				.where("teamId", "!=", "")
				.get()
		).docs[0];
		if (profileDoc) {
			return response(HttpStatus.NOT_FOUND, { message: "Not Found" });
		}

		const teamDoc = await getFirestore()
			.collection(TEAMS_COLLECTION)
			.doc(doc.data().teamId)
			.get();
		if (!teamDoc.exists) {
			return response(HttpStatus.NOT_FOUND, { message: "Not Found" });
		}

		const team = teamDoc.data() as Team;

		const ownerDetails = (
			await getFirestore()
				.collection(USER_PROFILES_COLLECTION)
				.where("uid", "==", team.owner)
				.where("teamId", "==", team.id)
				.get()
		).docs[0]?.data();
		if (!ownerDetails) {
			return response(HttpStatus.NOT_FOUND, { message: "Not Found" });
		}

		return response(HttpStatus.OK, {
			message: "ok",
			data: {
				teamName: team.name,
				owner: `${ownerDetails.firstName} ${ownerDetails.lastName}`,
			},
		});
	} catch (e) {
		logError("Failed to check invitation.", {
			error: e,
			func: "checkInvitation",
		});
		return response(HttpStatus.INTERNAL_SERVER_ERROR, {
			message: "Service Down (invitation) ",
		});
	}
});

export const getInvitations = onCall(async (req) => {
	if (!req.auth) {
		throw new HttpsError("unauthenticated", "User must be logged in.");
	}

	const func = "getInvitations";
	const uid = req.auth.uid;
	const firestore = getFirestore();

	try {
		const snap = await firestore
			.collection(INVITATIONS_COLLECTION)
			.where("userId", "==", uid)
			.where("status", "==", "pending")
			.get();
		if (snap.empty) {
			return response(HttpStatus.OK, {
				data: [],
			});
		}

		const invitations: Invitation[] = [];
		snap.forEach((doc) => {
			invitations.push(doc.data() as Invitation);
		});

		const teamDataMap = new Map<
			string,
			{ teamName: string; ownerName: string }
		>();
		for (const inv of invitations) {
			if (!teamDataMap.has(inv.teamId)) {
				const teamSnap = await firestore
					.collection(TEAMS_COLLECTION)
					.doc(inv.teamId)
					.get();
				if (teamSnap.exists) {
					const team = teamSnap.data() as Team;
					// get owner details
					const ownerSnap = await firestore
						.collection(USER_PROFILES_COLLECTION)
						.where("uid", "==", team.owner)
						.get();
					const ownerData = ownerSnap.docs[0]?.data() as UserProfile;
					const ownerName = ownerData
						? `${ownerData.firstName} ${ownerData.lastName}`
						: "Unknown";
					teamDataMap.set(inv.teamId, {
						teamName: team.name,
						ownerName,
					});
				}
			}
		}

		return response(HttpStatus.OK, {
			data: invitations.map((inv) => {
				const teamData = teamDataMap.get(inv.teamId);
				return {
					id: inv.invitationId,
					teamName: teamData?.teamName ?? "",
					owner: teamData?.ownerName ?? "",
				};
			}),
		});
	} catch (e) {
		logError("Failed to get user's invitations", { error: e, func });
		return response(HttpStatus.INTERNAL_SERVER_ERROR, {
			message: "Service down 1211",
		});
	}
});
