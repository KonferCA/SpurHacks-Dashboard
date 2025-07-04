import { functions } from "@/services/firebase";
import { logError } from "@/services/firebase/log";
import { httpsCallable } from "firebase/functions";
import type {
	CloudFunctionResponse,
	Invitation,
	MemberData,
	TeamData,
} from "./types";

/**
 * Get the team the authenticated user belongs to.
 */
export async function getTeam() {
	try {
		const fn = httpsCallable<unknown, CloudFunctionResponse<TeamData>>(
			functions,
			"getTeam",
		);
		const { data } = await fn();
		return data;
	} catch (e) {
		await logError(e as Error, "get_team_error");
		throw e;
	}
}

/**
 * Searches if a team with given name exists or not
 */
export async function isTeamNameAvailable(name: string) {
	try {
		const fn = httpsCallable<unknown, CloudFunctionResponse<boolean>>(
			functions,
			"isTeamNameAvailable",
		);
		const { data } = await fn({ name });
		if (data.status === 200) {
			return data.data;
		}
	} catch (e) {
		await logError(e as Error, "available_team_name_error");
		throw e;
	}

	return false;
}

/**
 * Calls the cloud function to create new team
 */
export async function createTeam(name: string) {
	try {
		const fn = httpsCallable<unknown, CloudFunctionResponse<TeamData>>(
			functions,
			"createTeam",
		);
		const { data } = await fn({ name });
		return data;
	} catch (e) {
		await logError(e as Error, "create_team_error");
		throw e;
	}
}

// The following functions are team owners only. Regular members calling this will result in failure/rejection

/**
 * Calls the cloud function that sends emails to the given members.
 */
export async function inviteMember(emails: string[]) {
	try {
		const fn = httpsCallable<unknown, CloudFunctionResponse<MemberData>>(
			functions,
			"inviteMember",
		);
		const { data } = await fn({ emails });
		return data;
	} catch (e) {
		await logError(e as Error, "invite_members_error");
		throw e;
	}
}

/**
 * Calls the cloud function 'updateTeamName' that updates the given team
 */
export async function updateTeamName(name: string) {
	try {
		const fn = httpsCallable<unknown, CloudFunctionResponse<void>>(
			functions,
			"updateTeamName",
		);
		const { data } = await fn({ name });
		return data;
	} catch (e) {
		await logError(e as Error, "update_team_name_error");
		throw e;
	}
}

/**
 * Calls the cloud function 'removeMembers' that removes memebrs from a given team
 * @param emails - the emails of the members to remove from the team.
 */
export async function removeMembers(emails: string[]) {
	try {
		const fn = httpsCallable<unknown, CloudFunctionResponse<void>>(
			functions,
			"removeMembers",
		);
		const { data } = await fn({ emails });
		return data;
	} catch (e) {
		await logError(e as Error, "remove_members_error");
		throw e;
	}
}

/**
 * Calls the cloud function 'leaveTeam' that allows any team member to leave their current team
 */
export async function leaveTeam() {
	try {
		const fn = httpsCallable<unknown, CloudFunctionResponse<void>>(
			functions,
			"leaveTeam",
		);
		const { data } = await fn();
		return data;
	} catch (e) {
		await logError(e as Error, "leave_team_error");
		throw e;
	}
}

/**
 * Calls the cloud function 'deleteTeam' that deletes the given team the requesting user owns
 */
export async function deleteTeam() {
	try {
		const fn = httpsCallable<unknown, CloudFunctionResponse<void>>(
			functions,
			"deleteTeam",
		);
		const { data } = await fn();
		return data;
	} catch (e) {
		await logError(e as Error, "delete_team_error");
		throw e;
	}
}

/**
 * Calls the cloud function 'validateTeamInvitation' that validates the invitation code.
 * If it is a valid code and meant to be for the authenticated user, then it will add
 * the user to the team.
 */
export async function validateTeamInvitation(code: string) {
	try {
		const fn = httpsCallable<unknown, CloudFunctionResponse<void>>(
			functions,
			"validateTeamInvitation",
		);
		const { data } = await fn({ code });
		return data;
	} catch (e) {
		await logError(e as Error, "validate_team_invitation_error");
		throw e;
	}
}

/**
 * Calls the cloud function 'rejectInvitation' that rejects an invitation.
 */
export async function rejectInvitation(code: string) {
	try {
		const fn = httpsCallable<unknown, CloudFunctionResponse<void>>(
			functions,
			"rejectInvitation",
		);
		const { data } = await fn({ code });
		return data;
	} catch (e) {
		await logError(e as Error, "reject_invitation_error");
		throw e;
	}
}

/**
 * Checks if an invitation exists or not
 */
export async function checkInvitation(code: string) {
	try {
		const fn = httpsCallable<unknown, CloudFunctionResponse<Invitation>>(
			functions,
			"checkInvitation",
		);
		const { data } = await fn({ code });
		return data;
	} catch (e) {
		await logError(e as Error, "check_invitation_error");
		throw e;
	}
}

/**
 * Facilitate users to accept team invitations when they didn't receive an email
 */
export async function getInvitations() {
	try {
		const fn = httpsCallable<unknown, CloudFunctionResponse<Invitation[]>>(
			functions,
			"getInvitations",
		);
		const { data } = await fn();
		return data;
	} catch (e) {
		await logError(e as Error, "get_user_invitations_errro");
		throw e;
	}
}
