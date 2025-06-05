import { LoadingAnimation, PageWrapper, TextInput } from "@/components";
import { InfoCallout } from "@/components/InfoCallout/InfoCallout";
import { Modal } from "@/components/Modal";
import { toaster } from "@/components/ui/toaster";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/providers";
import { paths } from "@/providers/RoutesProvider/data";
import {
	createTeam,
	deleteTeam,
	getTeamByUser,
	getUserInviations,
	inviteMember,
	isTeamNameAvailable,
	rejectInvitation,
	removeMembers,
	updateTeamName,
	validateTeamInvitation,
} from "@/services/firebase/teams";
import type { Invitation } from "@/services/firebase/types";
// import { isBefore } from "date-fns";
import { useUserStore } from "@/stores/user.store";
import { Button } from "@chakra-ui/react";
import {
	PencilIcon,
	PlusCircleIcon,
	XCircleIcon as XCircleOutlineIcon,
} from "@heroicons/react/24/outline";
import {
	CheckCircleIcon,
	ClockIcon,
	XCircleIcon,
} from "@heroicons/react/24/solid";
import { type FormEventHandler, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { z } from "zod";

// const teamEditCloseDate = "2024-05-17T00:00:00";

export const MyTeamPage = () => {
	const team = useUserStore((state) => state.team);
	const setTeam = useUserStore((state) => state.setTeam);
	const updateTeamNameState = useUserStore((state) => state.updateTeamName);
	const [invitations, setInvitations] = useState<Invitation[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [teamName, setTeamName] = useState("");
	const [isTeamNameTaken, setIsTeamNameTaken] = useState(false);
	const [invalidTeamName, setInvalidTeamName] = useState(false);
	const [openInviteDialog, setOpenInviteDialog] = useState(false);
	const [invalidEmailMsg, setInvalidEmailMsg] = useState("");
	const [email, setEmail] = useState("");
	const [disableAllActions, setDisableAllActions] = useState(false);
	const [isEditingTeamName, setIsEditingTeamName] = useState(false);
	const [openTeammatesDialog, setOpenTeammatesDialog] = useState(false);
	const [openInvitations, setOpenInvitations] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState("");
	// holds ths emails of the members to be removed
	const [toBeRemovedTeammates, setToBeRemovedTeammates] = useState<string[]>(
		[],
	);
	const { currentUser } = useAuth();
	const debounce = useDebounce(
		//@ts-ignore
		async (name: string) => {
			if (!name) return;
			// search if team name is available
			setIsTeamNameTaken(!(await isTeamNameAvailable(name)));
		},
		250,
	);
	const loadingTimeoutRef = useRef<number | null>(null);

	const submitNewTeam: FormEventHandler<HTMLFormElement> = async (e) => {
		e.preventDefault();
		// if (!isBefore(new Date(), teamEditCloseDate)) return;
		setIsLoading(true);

		const res = await z.string().min(1).safeParseAsync(teamName);
		if (res.success) {
			// try to create the new team
			try {
				const res = await createTeam(teamName);
				if (res.status === 201) {
					toaster.success({
						title: "Team Created!",
						description:
							"Awesome, it looks like your team has been created successfully! Start inviting hackers into your team!",
					});
					setTeam(res.data);
					setTeamName("");
				} else {
					toaster.error({
						title: "It looks like something went wrong",
						description: res.message,
					});
				}
			} catch (e) {
				toaster.error({
					title: "Oh Uh! Error Creating Team",
					description: `Please try again later. (${(e as Error).message})`,
				});
			} finally {
				setIsLoading(false);
			}
		} else {
			setInvalidTeamName(true);
		}
	};

	const closeInviteDialog = () => {
		// do not close dialog if disableAllActions invitations
		if (disableAllActions) return;
		setOpenInviteDialog(false);
		setEmail("");
	};

	const closeTeammatesDialog = () => {
		if (disableAllActions) return;
		setOpenTeammatesDialog(false);
		setToBeRemovedTeammates([]);
	};

	const sendInvitation = async () => {
		setIsLoading(true);
		// do not allow to send another invitation to someone who is already in the team
		if (team?.members.some((m) => m.email === email)) return;
		setDisableAllActions(true);
		try {
			const { status, data, message } = await inviteMember(email);
			if (status === 201 && data && team) {
				const newTeam = { ...team };
				newTeam.members.push(data);
				setTeam(newTeam);
				setEmail("");
				toaster.success({
					title: "Invitation Sent!",
				});
			} else if (status >= 400 && status < 500) {
				toaster.error({
					title: "Error Sending Invitation",
					description: message,
				});
			} else {
				toaster.error({
					title: "Error Sending Invitation",
					description: "Please try again later.",
				});
			}
		} catch (e) {
			toaster.error({
				title: "Error Sending Invitation",
				description: `Please try again later. (${(e as Error).message})`,
			});
		} finally {
			setIsLoading(false);
			setDisableAllActions(false);
		}
	};

	const handleDeleteTeam = async () => {
		setIsLoading(true);

		try {
			setDisableAllActions(true);
			const res = await deleteTeam();
			if (res.status === 200) {
				toaster.success({
					title: "Team Deleted!",
					description: "Feel free to create a new team!",
				});
				flushSync(() => {
					// reset all states
					setTeam(null);
					setTeamName("");
					setEmail("");
					setConfirmDelete("");
				});
			} else {
				toaster.error({
					title: "Oh no... Something went wrong",
					description: res.message,
				});
			}
		} catch (e) {
			toaster.error({
				title: "Error Deleting Team",
				description: `Please try again later. (${(e as Error).message})`,
			});
		} finally {
			setIsLoading(false);
			setDisableAllActions(false);
		}
	};

	const handleTeamNameUpdate = async () => {
		setIsLoading(true);
		const res = await z.string().min(1).safeParseAsync(teamName);

		if (res.success) {
			setDisableAllActions(true);
			try {
				const res = await updateTeamName(teamName);
				if (res.status === 200) {
					toaster.success({
						title: "Team Name Updated!",
						description:
							"You have until May 16th to change the team name again.",
					});
					// want to set the new team name in the team object
					updateTeamNameState(teamName);
					setTeamName("");
					setIsEditingTeamName(false);
					setInvalidTeamName(false);
					setIsTeamNameTaken(false);
				} else {
					toaster.error({
						title: "Oh no... Something went wrong.",
						description: res.message,
					});
				}
			} catch (e) {
				toaster.error({
					title: "Error Updating Team Name",
					description: `Please try again later. (${(e as Error).message})`,
				});
			} finally {
				setIsLoading(false);
				setDisableAllActions(false);
			}
		} else {
			setInvalidTeamName(true);
		}
	};

	const handleRemoveTeammates = async () => {
		if (toBeRemovedTeammates.length < 1) {
			// just close the dialog
			closeTeammatesDialog();
			return;
		}

		try {
			setDisableAllActions(true);
			const res = await removeMembers(toBeRemovedTeammates);
			if (res.status === 200) {
				toaster.success({
					title: "Successfully removed teammate(s)",
					description: "",
				});
				// set new team members list
				if (team) {
					const newTeam = { ...team };
					newTeam.members = team?.members.filter(
						(m) => !toBeRemovedTeammates.includes(m.email),
					);
					setTeam(newTeam);
				}
				closeTeammatesDialog();
			} else {
				toaster.error({
					title: "Oh no... Something went wrong",
					description: res.message,
				});
			}
		} catch (e) {
			toaster.error({
				title: "Error Removing Teammates",
				description: (e as Error).message,
			});
		} finally {
			setDisableAllActions(false);
		}
	};

	const fetchTeam = async () => {
		const [teamRes, invitationRes] = await Promise.allSettled([
			getTeamByUser(),
			getUserInviations(),
		]);
		if (teamRes.status === "fulfilled") {
			const res = teamRes.value;
			setTeam(res.data);
		} else {
			toaster.error({
				title: "Could not get team",
				description:
					"Yikes, something went wrong. Try again later; if the error continues, shoot us a message on our Discord tech-support channel.",
			});
		}
		if (invitationRes.status === "fulfilled") {
			const res = invitationRes.value;
			setInvitations(res.data ?? []);
		}
		if (loadingTimeoutRef.current !== null)
			window.clearTimeout(loadingTimeoutRef.current);
		setIsLoading(false);
	};

	const accept = async (invitationId: string) => {
		setDisableAllActions(true);
		try {
			const res = await validateTeamInvitation(invitationId);
			if (res.status === 200) {
				toaster.success({
					title: "Joined Team",
					description: "Hope you have a blast with your new team!",
				});
				await fetchTeam();
			} else {
				toaster.error({
					title: "Error Joining Team",
					description: res.message,
				});
			}
		} catch (e) {
			toaster.error({
				title: "Error Joining Team",
				description: (e as Error).message,
			});
		}
		setDisableAllActions(false);
	};

	const reject = async (invitationId: string) => {
		setDisableAllActions(true);
		try {
			const res = await rejectInvitation(invitationId);
			if (res.status === 200) {
				toaster.success({
					title: "Team Inviation Rejected",
				});
				await fetchTeam();
			} else {
				toaster.error({
					title: "Error Rejecting Invitation",
					description: res.message,
				});
			}
		} catch (e) {
			toaster.error({
				title: "Error Rejecting Invitation",
				description: (e as Error).message,
			});
		}
		setDisableAllActions(false);
	};

	useEffect(() => {
		if (team) {
			// cached team data
			return;
		}

		if (loadingTimeoutRef.current !== null)
			window.clearTimeout(loadingTimeoutRef.current);
		loadingTimeoutRef.current = window.setTimeout(
			() => setIsLoading(false),
			1500,
		);
		if (!currentUser) return;
		fetchTeam();
	}, []);

	useEffect(() => {
		window.localStorage.setItem(paths.myTeam, "visited");
	}, []);

	if (isLoading) return <LoadingAnimation />;

	if (!team)
		return (
			<PageWrapper>
				<div className="space-y-4">
					<div className="w-fit text-lg space-y-2">
						<InfoCallout text="It looks like you are not enrolled in a team. Create one below, or enroll in an existing team by receiving an invitation from the team owner." />
					</div>
					<div className="space-y-4 lg:space-y-0 lg:flex gap-4">
						<div className="max-w-lg flex-1 p-4 shadow-basic rounded-lg">
							<form className="mt-6 space-y-4" onSubmit={submitNewTeam}>
								<TextInput
									label="Team Name"
									id="team-name-input"
									description={"Enter an awesome team name."}
									error={
										invalidTeamName
											? "The entered team name is not valid."
											: isTeamNameTaken
												? "The team name has been taken. Please choose another one."
												: undefined
									}
									required
									value={teamName}
									onChange={(e) => {
										setInvalidTeamName(false);
										setTeamName(e.target.value);
										debounce(e.target.value);
									}}
								/>
								<Button type="submit">Create Team</Button>
							</form>
							{/* invitations */}
						</div>
						<div>
							<Button
								onClick={() => !disableAllActions && setOpenInvitations(true)}
								className="relative"
							>
								View Invitations
								{invitations.length ? (
									<span className="absolute flex h-2 w-2 top-0 right-0 -translate-y-full translate-x-full">
										<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
										<span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
									</span>
								) : null}
							</Button>
						</div>
					</div>
				</div>
				<Modal
					open={openInvitations}
					title="Invitations"
					subTitle="Here you can accept/reject team invitations"
					onClose={() => !disableAllActions && setOpenInvitations(false)}
				>
					<ul className="max-h-96 overflow-y-auto space-y-4">
						{invitations.map((i) => (
							<li
								key={i.id}
								className="rounded-lg p-4 hover:bg-gray-100 transition"
							>
								<p>
									Invitation to join{" "}
									<span className="font-bold">{i.teamName}</span>
								</p>
								<div className="flex gap-2 mt-4">
									<Button
										onClick={() => accept(i.id)}
										disabled={disableAllActions}
										className="p-2 bg-tbrand"
									>
										Accept
									</Button>
									<Button
										onClick={() => reject(i.id)}
										disabled={disableAllActions}
										className="p-2"
									>
										Reject
									</Button>
								</div>
							</li>
						))}
					</ul>
				</Modal>
			</PageWrapper>
		);

	return (
		<PageWrapper>
			<div>
				<div className="flex gap-4 flex-col sm:flex-row md:flex-col lg:flex-row lg:min-h-[20rem] [&>div]:p-5 [&>div]:rounded-lg [&>div]:shadow-basic lg:[&>div]:flex-auto">
					<div className="w-full lg:max-w-sm h-fit">
						<div className="relative">
							<h3 className="font-bold">
								{team.isOwner ? "Add Teammates" : "My Teammates"}
							</h3>
							{/* members length has to be less than 3 because the logged in user is not in the list */}
							{team.isOwner && team.members.length < 3 && (
								<button
									type="button"
									aria-label="add teammates"
									className="absolute group right-2 top-1/2 -translate-y-1/2"
									onClick={() => setOpenInviteDialog(true)}
								>
									<PlusCircleIcon className="w-8 h-8 text-charcoalBlack/70 transition group-hover:text-charcoalBlack" />
								</button>
							)}
						</div>
						{/* separator */}
						<hr className="h-[1px] bg-gray-200 my-4" />
						<ul className="space-y-4">
							{team &&
								team.members.length > 0 &&
								team.members.map((m) => (
									<li
										key={m.email}
										className="p-4 shadow-basic rounded-lg relative"
									>
										<div>
											<p className="font-medium">
												<span>{m.firstName}</span> <span>{m.lastName}</span>
											</p>
											<p className="text-gray-500">{m.email}</p>
										</div>
										<div className="absolute right-2 top-1/2 -translate-y-1/2">
											{m.status === "accepted" && (
												<CheckCircleIcon className="w-8 h-8 text-tbrand" />
											)}
											{m.status === "pending" && (
												<ClockIcon className="w-8 h-8 text-yellow-500" />
											)}
											{m.status === "rejected" && (
												<XCircleIcon className="w-8 h-8 text-red-500" />
											)}
										</div>
									</li>
								))}
						</ul>
						{team?.isOwner && (
							<div className="mt-8 flex items-center justify-end">
								<Button onClick={() => setOpenTeammatesDialog(true)}>
									Edit Team
								</Button>
							</div>
						)}
					</div>
					<div className="w-full h-fit lg:max-w-[30rem]">
						<div className="relative">
							<h3 className="font-bold">Team Name</h3>
							{team.isOwner && (
								<button
									type="button"
									aria-label="edit team name"
									className="absolute group right-2 top-1/2 -translate-y-1/2"
									onClick={() => setIsEditingTeamName(!isEditingTeamName)}
								>
									{!isEditingTeamName && (
										<PencilIcon className="w-7 h-7 text-charcoalBlack/70 transition group-hover:text-charcoalBlack" />
									)}
									{isEditingTeamName && (
										<XCircleOutlineIcon className="w-8 h-8 text-charcoalBlack/70 transition group-hover:text-charcoalBlack" />
									)}
								</button>
							)}
						</div>
						{/* separator */}
						<div className="h-[1px] bg-gray-200 my-4" />
						<div className="relative">
							{!isEditingTeamName && team && <p>{team.teamName}</p>}
							{isEditingTeamName && team && team.isOwner && (
								<>
									<TextInput
										label="Edit Team Name"
										srLabel
										id="edit-team-name-input"
										value={teamName}
										onChange={(e) => {
											setInvalidTeamName(false);
											setIsTeamNameTaken(false);
											setTeamName(e.target.value);
											debounce(e.target.value);
										}}
										placeholder="Awesome Team Name Here!"
										description={"Enter an awesome team name."}
										error={
											invalidTeamName
												? "The entered team name is not valid."
												: isTeamNameTaken
													? "The team name has been taken. Please choose another one."
													: undefined
										}
									/>
									<div className="flex items-center justify-end">
										<Button onClick={handleTeamNameUpdate} className="mt-8">
											Confirm
										</Button>
									</div>
								</>
							)}
						</div>
					</div>
				</div>
				{team?.isOwner && (
					<div className="shadow-basic p-4 max-w-xl rounded-lg mt-8">
						<div className="space-y-4">
							<h3 className="font-bold">Delete Team?</h3>
							<p>Are you sure you want to delete your team?</p>
							<p>Retype your team name to confirm deletion.</p>
						</div>
						<TextInput
							label="Confirm Delete Team"
							id="confirm-delete-team-input"
							placeholder="Team name"
							srLabel
							value={confirmDelete}
							onChange={(e) => setConfirmDelete(e.target.value)}
						/>
						<div className="mt-3 flex items-center justify-end">
							<Button
								disabled={confirmDelete !== team?.teamName}
								onClick={handleDeleteTeam}
							>
								Delete
							</Button>
						</div>
					</div>
				)}
			</div>
			<Modal
				open={openInviteDialog}
				onClose={closeInviteDialog}
				title="Invite a teammate"
				subTitle="Send a team invitation via email!"
			>
				<TextInput
					required
					label="Email"
					id="invite-email"
					type="email"
					srLabel
					placeholder="name@email.com"
					value={email}
					error={invalidEmailMsg}
					onChange={(e) => setEmail(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							const res = z
								.string()
								.email()
								.safeParse((e.target as HTMLInputElement).value);
							if (res.success) {
								sendInvitation();
							} else {
								setInvalidEmailMsg("The email entered is not a valid email.");
							}
						} else {
							if (invalidEmailMsg) setInvalidEmailMsg("");
						}
					}}
				/>
				<div className="h-12" />
				<div className="flex items-center justify-center">
					<Button
						disabled={
							disableAllActions || team.members.some((m) => m.email === email)
						}
						type="button"
						onClick={() => {
							const res = z.string().email().safeParse(email);
							if (res.success) {
								sendInvitation();
							} else {
								setInvalidEmailMsg("The email entered is not a valid email.");
							}
						}}
					>
						Send Invitation
					</Button>
				</div>
			</Modal>
			<Modal
				open={openTeammatesDialog}
				onClose={closeTeammatesDialog}
				title="Edit Team"
				subTitle="Manage your teammates!"
			>
				<ul className="space-y-4">
					{team &&
						team.members.length > 0 &&
						team.members
							.filter((m) => !toBeRemovedTeammates.includes(m.email))
							.map((m) => (
								<li
									key={m.email}
									className="p-4 shadow-basic rounded-lg relative"
								>
									<div>
										<p className="font-medium">
											<span>{m.firstName}</span> <span>{m.lastName}</span>
										</p>
										<p className="text-gray-500">{m.email}</p>
									</div>
									<button
										type="button"
										onClick={() =>
											setToBeRemovedTeammates([
												...toBeRemovedTeammates,
												m.email,
											])
										}
										className="absolute right-2 top-1/2 -translate-y-1/2 group"
									>
										<XCircleOutlineIcon className="w-8 h-8 text-charcoalBlack/70 transition group-hover:text-charcoalBlack" />
									</button>
								</li>
							))}
				</ul>
				<div className="mt-8 flex items-center justify-center">
					<Button
						disabled={toBeRemovedTeammates.length < 1 || disableAllActions}
						className="px-14"
						onClick={handleRemoveTeammates}
					>
						Done
					</Button>
				</div>
			</Modal>
		</PageWrapper>
	);
};
