import { PageWrapper } from "@/components";
import { InfoCallout } from "@/components/InfoCallout/InfoCallout";
import { toaster } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/providers";
import { getProfilePictureURL } from "@/services/firebase/files";
import {
	createTeam,
	deleteTeam,
	getInvitations,
	getTeam,
	inviteMember,
	isTeamNameAvailable,
	leaveTeam,
	rejectInvitation,
	removeMembers,
	updateTeamName,
	validateTeamInvitation,
} from "@/services/firebase/teams";
import type { Invitation } from "@/services/firebase/types";
import { useUserStore } from "@/stores/user.store";
import {
	Badge,
	Box,
	Button,
	Card,
	CardBody,
	CardFooter,
	CardHeader,
	Dialog,
	Field,
	Flex,
	Heading,
	Icon,
	Image,
	Input,
	Text,
	useDisclosure,
} from "@chakra-ui/react";
import { type FormEventHandler, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
	FaCheck,
	FaClock,
	FaCrown,
	FaEdit,
	FaRegCheckCircle,
	FaTimes,
} from "react-icons/fa";
import { FaRegCircleXmark } from "react-icons/fa6";
import { PiPlusCircleBold, PiUserCirclePlusFill } from "react-icons/pi";
import { z } from "zod";

export const MyTeamPage = () => {
	const team = useUserStore((state) => state.team);
	const setTeam = useUserStore((state) => state.setTeam);
	const updateTeamNameState = useUserStore((state) => state.updateTeamName);
	const [invitations, setInvitations] = useState<Invitation[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [teamName, setTeamName] = useState("");
	const [isTeamNameTaken, setIsTeamNameTaken] = useState(false);
	const [invalidTeamName, setInvalidTeamName] = useState(false);
	const [invalidEmailMsg, setInvalidEmailMsg] = useState("");
	const [email, setEmail] = useState("");
	const [disableAllActions, setDisableAllActions] = useState(false);
	const [isEditingTeamName, setIsEditingTeamName] = useState(false);
	const [showConfirmDeleteTeam, setShowConfirmDeleteTeam] = useState(false);
	const [showConfirmLeaveTeam, setShowConfirmLeaveTeam] = useState(false);
	const [memberToRemove, setMemberToRemove] = useState<{
		email: string;
		name: string;
	} | null>(null);
	// holds ths emails of the members to be removed
	const [toBeRemovedTeammates, setToBeRemovedTeammates] = useState<string[]>(
		[],
	);
	// holds profile picture URLs for team members
	const [memberProfilePictures, setMemberProfilePictures] = useState<
		Record<string, string | null>
	>({});
	// holds failed profile picture loads for fallback handling
	const [failedProfilePictures, setFailedProfilePictures] = useState<
		Record<string, boolean>
	>({});
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
	const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const {
		open: isInviteOpen,
		onOpen: onInviteOpen,
		onClose: onInviteClose,
	} = useDisclosure();
	const {
		open: isTeammatesOpen,
		onOpen: _onTeammatesOpen,
		onClose: onTeammatesClose,
	} = useDisclosure();
	const {
		open: isInvitationsOpen,
		onOpen: onInvitationsOpen,
		onClose: onInvitationsClose,
	} = useDisclosure();

	const submitNewTeam: FormEventHandler<HTMLFormElement> = async (e) => {
		e.preventDefault();
		setIsLoading(true);

		const res = await z.string().min(1).safeParseAsync(teamName);
		if (res.success) {
			// try to create the new team
			try {
				const res = await createTeam(teamName);
				if (res.status >= 200 && res.status < 300) {
					toaster.success({
						title: "Team Created!",
						description: "Your team has been created successfully!",
					});
					await fetchTeam();
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
		onInviteClose();
		setEmail("");
	};

	const closeTeammatesDialog = () => {
		if (disableAllActions) return;
		onTeammatesClose();
		setToBeRemovedTeammates([]);
	};

	const sendInvitation = async () => {
		// resent error msg
		setInvalidEmailMsg("");
		// do not allow to send another invitation to someone who is already in the team
		if (team?.members?.some((m) => m.email === email)) {
			setInvalidEmailMsg(`User with email '${email}' is already in the team.`);
			return;
		}
		setIsLoading(true);
		setDisableAllActions(true);
		try {
			const { status, data, message } = await inviteMember([email]);
			if ((status === 200 || status === 201) && team) {
				if (data) {
					const newTeam = { ...team };
					newTeam.members.push(data);
					setTeam(newTeam);

					// convert profile picture ref to URL for the new member
					if (data.profilePictureRef) {
						try {
							const url = await getProfilePictureURL(data.profilePictureRef);
							setMemberProfilePictures((prev) => ({
								...prev,
								[data.email]: url,
							}));
						} catch (e) {
							console.error(
								"Failed to get profile picture URL for new member:",
								e,
							);
							setMemberProfilePictures((prev) => ({
								...prev,
								[data.email]: null,
							}));
						}
					} else {
						setMemberProfilePictures((prev) => ({
							...prev,
							[data.email]: null,
						}));
					}
				}
				setEmail("");
				toaster.success({
					title: "Invitation Sent!",
					description: message || "Member has been invited to your team.",
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

	const handleDeleteTeamClick = () => {
		setShowConfirmDeleteTeam((prev) => !prev);
	};

	const handleLeaveTeamClick = () => {
		setShowConfirmLeaveTeam((prev) => !prev);
	};

	const handleDeleteTeamConfirmed = async () => {
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
					setShowConfirmDeleteTeam(false);
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

	const handleLeaveTeamConfirmed = async () => {
		if (!currentUser?.email) return;

		setIsLoading(true);

		try {
			setDisableAllActions(true);
			const res = await leaveTeam();
			if (res.status === 200) {
				toaster.success({
					title: "Left Team Successfully!",
					description:
						"You have left the team. Feel free to join another team or create your own!",
				});
				flushSync(() => {
					// reset all states
					setTeam(null);
					setTeamName("");
					setEmail("");
					setShowConfirmLeaveTeam(false);
				});
			} else {
				toaster.error({
					title: "Oh no... Something went wrong",
					description: res.message,
				});
			}
		} catch (e) {
			toaster.error({
				title: "Error Leaving Team",
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
						description: "Team name updated successfully.",
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
				const newMembers = team?.members.filter(
					(m) => !toBeRemovedTeammates.includes(m.email),
				);
				// @ts-ignore
				setTeam({ ...team, members: newMembers });

				// remove profile pictures for removed members
				setMemberProfilePictures((prev) => {
					const updated = { ...prev };
					toBeRemovedTeammates.forEach((email) => {
						delete updated[email];
					});
					return updated;
				});

				// clear failed profile picture states for removed members
				setFailedProfilePictures((prev) => {
					const updated = { ...prev };
					toBeRemovedTeammates.forEach((email) => {
						delete updated[email];
						delete updated[`${email}-provider`];
					});
					return updated;
				});
			}

			closeTeammatesDialog();
		} catch (e) {
			toaster.error({
				title: "Error removing teammates",
				description: `Please try again later. (${(e as Error).message})`,
			});
		} finally {
			setIsLoading(false);
			setDisableAllActions(false);
		}
	};

	const handleRemoveMemberClick = (memberEmail: string, memberName: string) => {
		setMemberToRemove({ email: memberEmail, name: memberName });
	};

	const handleRemoveMemberConfirmed = async () => {
		if (!memberToRemove) return;

		try {
			setDisableAllActions(true);
			const res = await removeMembers([memberToRemove.email]);
			if (res.status === 200) {
				toaster.success({
					title: "Member Removed",
					description: `${memberToRemove.name} has been removed from the team.`,
				});
				// set new team members list
				const newMembers = team?.members.filter(
					(m) => m.email !== memberToRemove.email,
				);
				// @ts-ignore
				setTeam({ ...team, members: newMembers });

				// remove profile picture for removed member
				setMemberProfilePictures((prev) => {
					const updated = { ...prev };
					delete updated[memberToRemove.email];
					return updated;
				});

				// clear failed profile picture state for removed member
				setFailedProfilePictures((prev) => {
					const updated = { ...prev };
					delete updated[memberToRemove.email];
					delete updated[`${memberToRemove.email}-provider`];
					return updated;
				});

				// reset the member to remove
				setMemberToRemove(null);
			} else {
				toaster.error({
					title: "Error removing member",
					description: res.message,
				});
			}
		} catch (e) {
			toaster.error({
				title: "Error removing member",
				description: `Please try again later. (${(e as Error).message})`,
			});
		} finally {
			setDisableAllActions(false);
		}
	};

	const fetchTeam = async () => {
		setIsLoading(true);
		if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
		try {
			const [team, invitations] = await Promise.all([
				getTeam(),
				getInvitations(),
			]);
			setTeam(team.data || null);
			setInvitations(invitations.data || []);

			// convert profile picture refs to URLs for team members
			if (team.data?.members) {
				const profilePictureUrls: Record<string, string | null> = {};

				for (const member of team.data.members) {
					if (member.profilePictureRef) {
						try {
							const url = await getProfilePictureURL(member.profilePictureRef);
							profilePictureUrls[member.email] = url;
						} catch (e) {
							console.error(
								`Failed to get profile picture URL for ${member.email}:`,
								e,
							);
							profilePictureUrls[member.email] = null;
						}
					} else {
						profilePictureUrls[member.email] = null;
					}
				}

				setMemberProfilePictures(profilePictureUrls);
			}
		} catch (e) {
			toaster.error({
				title: "Error fetching data",
				description: `Please try again later. (${(e as Error).message})`,
			});
		} finally {
			setIsLoading(false);
		}
	};

	const accept = async (invitationId: string) => {
		// do not accept invitation if the user is already in a team
		if (team) return;
		setIsLoading(true);
		try {
			setDisableAllActions(true);
			const res = await validateTeamInvitation(invitationId);
			if (res.status === 200) {
				toaster.success({
					title: "Successfully accepted invitation!",
					description:
						"You can now see your team members and collaborate with them!",
				});
				// refetch team
				await fetchTeam();
			} else {
				toaster.error({
					title: "Oh no... Something went wrong.",
					description: res.message,
				});
			}
		} catch (e) {
			toaster.error({
				title: "Error accepting invitation",
				description: `Please try again later. (${(e as Error).message})`,
			});
		} finally {
			setIsLoading(false);
			setDisableAllActions(false);
		}
	};

	const reject = async (invitationId: string) => {
		setIsLoading(true);
		try {
			setDisableAllActions(true);
			const res = await rejectInvitation(invitationId);
			if (res.status === 200) {
				toaster.success({
					title: "Successfully rejected invitation!",
					description: "",
				});
				// remove invitation from list
				setInvitations(invitations.filter((i) => i.id !== invitationId));
			} else {
				toaster.error({
					title: "Oh no... Something went wrong.",
					description: res.message,
				});
			}
		} catch (e) {
			toaster.error({
				title: "Error rejecting invitation",
				description: `Please try again later. (${(e as Error).message})`,
			});
		} finally {
			setIsLoading(false);
			setDisableAllActions(false);
		}
	};

	useEffect(() => {
		// on load, get the team
		if (currentUser) {
			// give it 500 ms to show loading animation
			loadingTimeoutRef.current = setTimeout(() => {
				fetchTeam();
			}, 500);
		}
		return () => {
			if (loadingTimeoutRef.current) {
				clearTimeout(loadingTimeoutRef.current);
			}
		};
	}, [currentUser]);

	return (
		<PageWrapper>
			{isLoading ? (
				<Flex justify="center" align="center" h="full">
					<Text>Loading...</Text>
				</Flex>
			) : (
				<Flex direction="column" gap={6} maxWidth="590px">
					{team ? (
						<Card.Root rounded="4xl">
							<CardHeader>
								<Flex direction="column" gap={4}>
									{/* Team Name Section */}
									{isEditingTeamName ? (
										<Flex>
											<Field.Root invalid={invalidTeamName || isTeamNameTaken}>
												<Input
													value={teamName}
													onChange={(e) => {
														setTeamName(e.target.value);
														debounce(e.target.value);
													}}
													placeholder="New team name"
												/>
												<Field.ErrorText>
													{isTeamNameTaken
														? "Team name is already taken."
														: "Team name cannot be empty."}
												</Field.ErrorText>
											</Field.Root>
											<Button
												onClick={handleTeamNameUpdate}
												ml={2}
												loading={isLoading}
												rounded="full"
												colorScheme="brand"
												color="black"
												size="sm"
											>
												<FaCheck />
											</Button>
											<Button
												onClick={() => setIsEditingTeamName(false)}
												ml={2}
												rounded="full"
												variant="outline"
												size="sm"
											>
												<FaTimes />
											</Button>
										</Flex>
									) : (
										<Flex align="center" justify="space-between" w="full">
											<Flex align="center" w="full">
												<Heading size="lg" lineClamp={2} truncate maxW="full">
													{team.teamName}
												</Heading>
												{team.isOwner && (
													<Button
														onClick={() => {
															setIsEditingTeamName(true);
															setTeamName(team.teamName);
														}}
														ml={2}
														size="sm"
														rounded="full"
														variant="outline"
													>
														<FaEdit />
													</Button>
												)}
											</Flex>
										</Flex>
									)}

									{/* Team Members Header */}
									<Heading size="md" color="fg.muted">
										MEMBERS
									</Heading>
								</Flex>
							</CardHeader>
							<CardBody>
								{team?.members
									?.sort((a, b) => {
										// put the owner first
										if (a.email === team.ownerEmail) return -1;
										if (b.email === team.ownerEmail) return 1;
										return 0;
									})
									?.map((member) => (
										<Box key={member.email}>
											<Flex
												justify="space-between"
												align="center"
												py={3}
												px={{ base: 3, md: 4 }}
												bg="#1f1e2d"
												borderRadius="2xl"
												mb={2}
											>
												<Flex align="center" gap={{ base: 2, md: 3 }}>
													{/* Profile Picture */}
													<Box
														boxSize={{ base: "36px", md: "40px" }}
														borderRadius="full"
														bg="#1f1e2d"
														display="flex"
														alignItems="center"
														justifyContent="center"
														overflow="hidden"
														flexShrink={0}
													>
														{memberProfilePictures[member.email] && !failedProfilePictures[member.email] ? (
															<Image
																src={memberProfilePictures[member.email] as string}
																alt={`${member.firstName} ${member.lastName}`}
																boxSize="full"
																borderRadius="full"
																objectFit="cover"
																onError={() => {
																	setFailedProfilePictures((prev) => ({
																		...prev,
																		[member.email]: true,
																	}));
																}}
															/>
														) : member.providerPhotoURL && !failedProfilePictures[`${member.email}-provider`] ? (
															<Image
																src={member.providerPhotoURL}
																alt={`${member.firstName} ${member.lastName}`}
																boxSize="full"
																borderRadius="full"
																objectFit="cover"
																onError={() => {
																	setFailedProfilePictures((prev) => ({
																		...prev,
																		[`${member.email}-provider`]: true,
																	}));
																}}
															/>
														) : (
															<Box
																boxSize="full"
																bg="#1f1e2d"
																display="flex"
																alignItems="center"
																justifyContent="center"
																color="gray.300"
																fontSize="sm"
																fontWeight="bold"
															>
																{member.firstName.charAt(0)}
																{member.lastName.charAt(0)}
															</Box>
														)}
													</Box>

													<Box>
														<Flex align="center" gap={2}>
															<Box display={{ base: "block", md: "none" }}>
																{member.status === "accepted" && (
																	<Icon
																		as={FaCheck}
																		color="green.400"
																		fontSize="sm"
																	/>
																)}
																{member.status === "pending" && (
																	<Icon
																		as={FaClock}
																		color="fg.muted"
																		fontSize="sm"
																	/>
																)}
															</Box>
															<Text fontWeight="medium">
																{member.firstName} {member.lastName}
															</Text>
															{member.email === team.ownerEmail && (
																<Tooltip content="Team Owner">
																	<Icon
																		as={FaCrown}
																		color="white"
																		fontSize="sm"
																	/>
																</Tooltip>
															)}
														</Flex>
														<Text
															color="fg.muted"
															fontSize="sm"
															overflow="hidden"
															textOverflow="ellipsis"
															whiteSpace="nowrap"
															maxWidth={{
																base: "120px",
																sm: "160px",
																md: "200px",
																lg: "none",
															}}
														>
															{member.email}
														</Text>
													</Box>
												</Flex>
												<Flex align="center" gap={{ base: 1, md: 2 }}>
													{team.isOwner &&
														member.email !== currentUser?.email && (
															<Box
																cursor="pointer"
																onClick={() =>
																	handleRemoveMemberClick(
																		member.email,
																		`${member.firstName} ${member.lastName}`,
																	)
																}
																_hover={{ color: "red.400" }}
																color="red.400"
															>
																<Icon
																	as={FaRegCircleXmark}
																	fontSize={{ base: "xl", md: "2xl" }}
																/>
															</Box>
														)}
													{member.status === "accepted" ? (
														<Icon
															as={FaRegCheckCircle}
															fontSize={{ base: "xl", md: "2xl" }}
															color="green.400"
															display={{ base: "none", md: "block" }}
														/>
													) : (
														<Badge
															bg="bg.hover"
															borderStyle="none"
															color="fg.muted"
															size="lg"
															rounded="full"
															px={3}
															py={1}
															textTransform="uppercase"
															flexShrink={0}
															display={{ base: "none", md: "block" }}
														>
															{member.status}
														</Badge>
													)}
												</Flex>
											</Flex>

											{memberToRemove &&
												memberToRemove.email === member.email && (
													<Flex
														justify="space-between"
														align="center"
														py={3}
														px={{ base: 3, md: 4 }}
														bg="#1f1e2d"
														borderRadius="2xl"
														mb={2}
													>
														<Text color="offwhite.primary/30">
															Are you sure?
														</Text>
														<Flex gap={1} align="center">
															<Box
																cursor="pointer"
																onClick={() => setMemberToRemove(null)}
																_hover={{ color: "gray.300" }}
																color="gray.400"
																p={1}
															>
																<Icon as={FaTimes} fontSize="lg" />
															</Box>
															<Button
																bg="#1f1e2e"
																color="brand.error"
																rounded="full"
																onClick={handleRemoveMemberConfirmed}
																size="sm"
															>
																Remove
															</Button>
														</Flex>
													</Flex>
												)}
										</Box>
									))}

								{team.isOwner && team?.members && team.members.length < 4 && (
									<Flex
										justify="space-between"
										align="center"
										py={2}
										px={2}
										cursor="pointer"
										onClick={onInviteOpen}
										borderRadius="2xl"
										border="3px dashed"
										borderColor="#1f1e2d"
										mt={2}
									>
										<Flex align="center" gap={{ base: 2, md: 3 }}>
											{/* User Plus Icon */}
											<Box
												boxSize={{ base: "36px", md: "40px" }}
												display="flex"
												alignItems="center"
												justifyContent="center"
												flexShrink={0}
											>
												<Icon
													as={PiUserCirclePlusFill}
													color="#686486"
													fontSize={{ base: "2xl", md: "3xl" }}
												/>
											</Box>

											<Box>
												<Text fontWeight="medium" color="fg.muted">
													Add a member
												</Text>
											</Box>
										</Flex>
										<Box
											cursor="pointer"
											onClick={(e) => {
												e.stopPropagation();
												onInviteOpen();
											}}
										>
											<Icon
												as={PiPlusCircleBold}
												color="#686486"
												fontSize={{ base: "xl", md: "2xl" }}
											/>
										</Box>
									</Flex>
								)}
							</CardBody>
							<CardFooter>
								<Flex direction="column" gap={4} w="full">
									{/* Danger Zone */}
									<Flex
										direction="column"
										gap={4}
										pt={4}
										borderTop="1px solid"
										borderColor="border.subtle"
									>
										<Text
											color="fg.muted"
											fontSize="sm"
											fontWeight="bold"
											textTransform="uppercase"
										>
											DANGER ZONE
										</Text>

										{team.isOwner ? (
											<>
												<Text color="fg.muted" fontSize="sm">
													Disbanding the team removes all current members. This
													action cannot be undone.
												</Text>
												<Flex direction="column" gap={2}>
													<Button
														bg="brand.error"
														color="offwhite.primary"
														rounded="full"
														onClick={handleDeleteTeamClick}
														alignSelf="start"
													>
														DISBAND TEAM
													</Button>
													{showConfirmDeleteTeam && (
														<Button
															bg="#1f1e2e"
															color="brand.error"
															rounded="full"
															onClick={handleDeleteTeamConfirmed}
															mt={-2}
															alignSelf="start"
														>
															<Text color="offwhite.primary/30" pr={2}>
																Are you sure?
															</Text>{" "}
															Yes, delete my team.
														</Button>
													)}
												</Flex>
											</>
										) : (
											<>
												<Text color="fg.muted" fontSize="sm">
													Leaving the team will remove you from all team
													activities. You can join another team or create your
													own.
												</Text>
												<Flex direction="column" gap={2}>
													<Button
														bg="brand.error"
														color="offwhite.primary"
														rounded="full"
														onClick={handleLeaveTeamClick}
														alignSelf="start"
													>
														LEAVE TEAM
													</Button>
													{showConfirmLeaveTeam && (
														<Button
															bg="#1f1e2e"
															color="brand.error"
															rounded="full"
															onClick={handleLeaveTeamConfirmed}
															mt={-2}
															alignSelf="start"
														>
															<Text color="offwhite.primary/30" pr={2}>
																Are you sure?
															</Text>{" "}
															Yes, leave team.
														</Button>
													)}
												</Flex>
											</>
										)}
									</Flex>
								</Flex>
							</CardFooter>
						</Card.Root>
					) : (
						<Card.Root rounded="4xl">
							<CardHeader>
								<Heading size="md">Create a Team</Heading>
							</CardHeader>
							<form onSubmit={submitNewTeam}>
								<CardBody>
									<Text color="fg.muted" mb={4} fontSize="sm">
										Start your hackathon journey by creating a team and inviting
										talented hackers to join you.
									</Text>
									<Field.Root invalid={invalidTeamName || isTeamNameTaken}>
										<Field.Label>Team Name</Field.Label>
										<Input
											value={teamName}
											onChange={(e) => {
												setTeamName(e.target.value);
												debounce(e.target.value);
											}}
											placeholder="Enter your team name"
										/>
										<Field.ErrorText>
											{isTeamNameTaken
												? "Team name is already taken."
												: "Team name cannot be empty."}
										</Field.ErrorText>
									</Field.Root>
								</CardBody>
								<CardFooter>
									<Button
										type="submit"
										loading={isLoading}
										rounded="full"
										colorScheme="brand"
										color="black"
										ml="auto"
										textTransform="uppercase"
									>
										Create Team
									</Button>
								</CardFooter>
							</form>
						</Card.Root>
					)}

					{/* always show view invitations button for users without teams */}
					{!team && (
						<Card.Root rounded="4xl">
							<CardHeader>
								<Heading size="md">Team Invitations</Heading>
							</CardHeader>
							<CardBody>
								<Text color="fg.muted" fontSize="sm">
									Check if other teams have invited you to join them before
									creating your own team.
								</Text>
							</CardBody>
							<CardFooter>
								<Button
									onClick={onInvitationsOpen}
									rounded="full"
									variant="outline"
									size="sm"
								>
									<Icon as={FaCheck} mr={2} />
									View Invitations
								</Button>
							</CardFooter>
						</Card.Root>
					)}

					<Dialog.Root
						open={isInviteOpen}
						onOpenChange={(details) => !details.open && onInviteClose()}
					>
						<Dialog.Backdrop />
						<Dialog.Positioner>
							<Dialog.Content>
								<Dialog.Header>Invite a new member</Dialog.Header>
								<Dialog.Body>
									<Field.Root invalid={!!invalidEmailMsg}>
										<Field.Label>Member's Email</Field.Label>
										<Input
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
										/>
										<Field.ErrorText>{invalidEmailMsg}</Field.ErrorText>
									</Field.Root>
								</Dialog.Body>
								<Dialog.Footer>
									<Button
										onClick={sendInvitation}
										loading={isLoading}
										disabled={disableAllActions}
										rounded="full"
										colorScheme="brand"
										color="black"
										textTransform="uppercase"
									>
										Send Invitation
									</Button>
									<Button
										ml={2}
										onClick={closeInviteDialog}
										variant="outline"
										rounded="full"
									>
										Cancel
									</Button>
								</Dialog.Footer>
								<Dialog.CloseTrigger asChild>
									<Button variant="ghost" size="sm" aria-label="Close" />
								</Dialog.CloseTrigger>
							</Dialog.Content>
						</Dialog.Positioner>
					</Dialog.Root>

					<Dialog.Root
						open={isTeammatesOpen}
						onOpenChange={(details) => !details.open && onTeammatesClose()}
					>
						<Dialog.Backdrop />
						<Dialog.Positioner>
							<Dialog.Content>
								<Dialog.Header>Remove Teammates</Dialog.Header>
								<Dialog.Body>
									{team?.members
										?.filter((m) => m.email !== currentUser?.email)
										?.map((member) => (
											<Flex
												key={member.email}
												justify="space-between"
												align="center"
											>
												<Text>
													{member.firstName} {member.lastName}
												</Text>
												<Button
													onClick={() => {
														if (toBeRemovedTeammates.includes(member.email)) {
															setToBeRemovedTeammates(
																toBeRemovedTeammates.filter(
																	(e) => e !== member.email,
																),
															);
														} else {
															setToBeRemovedTeammates([
																...toBeRemovedTeammates,
																member.email,
															]);
														}
													}}
													rounded="full"
													size="sm"
													{...(toBeRemovedTeammates.includes(member.email)
														? {
																colorScheme: "red",
																variant: "solid",
															}
														: { variant: "outline" })}
												>
													{toBeRemovedTeammates.includes(member.email)
														? "Selected"
														: "Select"}
												</Button>
											</Flex>
										))}
								</Dialog.Body>
								<Dialog.Footer>
									<Button
										variant="outline"
										rounded="full"
										borderColor="fg.muted"
										borderWidth="2px"
										color="fg.muted"
										bg="transparent"
										_hover={{
											borderColor: "red.500",
											color: "red.500",
											bg: "transparent",
										}}
										onClick={handleRemoveTeammates}
										loading={isLoading}
										disabled={disableAllActions}
									>
										Remove Selected
									</Button>
								</Dialog.Footer>
								<Dialog.CloseTrigger asChild>
									<Button variant="ghost" size="sm" aria-label="Close" />
								</Dialog.CloseTrigger>
							</Dialog.Content>
						</Dialog.Positioner>
					</Dialog.Root>

					<Dialog.Root
						open={isInvitationsOpen}
						onOpenChange={(details) => !details.open && onInvitationsClose()}
					>
						<Dialog.Backdrop />
						<Dialog.Positioner>
							<Dialog.Content rounded="4xl" maxWidth="500px">
								<Dialog.Header>
									<Flex align="center" gap={3}>
										<Heading size="lg">Team Invitations</Heading>
									</Flex>
								</Dialog.Header>
								<Dialog.Body>
									{invitations.length === 0 ? (
										<Box textAlign="center" py={8}>
											<Text color="fg.muted" fontSize="lg" fontWeight="medium">
												No pending invitations
											</Text>
											<Text color="fg.muted" fontSize="sm" mt={2}>
												Check back later for new team invitations.
											</Text>
										</Box>
									) : (
										<Flex direction="column" gap={4}>
											{invitations.map((invitation) => (
												<Flex
													key={invitation.id}
													justify="space-between"
													align="flex-start"
													gap={4}
													py={3}
													borderBottom="1px solid"
													borderColor="border.subtle"
													_last={{ borderBottom: "none" }}
												>
													<Box flex="1">
														<Flex align="center" gap={2} mb={1}>
															<Text fontWeight="bold" fontSize="lg">
																{invitation.teamName}
															</Text>
														</Flex>
														<Text color="fg.muted" fontSize="sm">
															Invited by {invitation.owner}
														</Text>
													</Box>
													<Flex direction="column" gap={2} flexShrink={0}>
														<Button
															colorScheme="brand"
															color="black"
															onClick={() => accept(invitation.id)}
															rounded="full"
															size="sm"
															width="full"
														>
															Accept
														</Button>
														<Button
															variant="outline"
															rounded="full"
															borderColor="fg.muted"
															borderWidth="2px"
															color="fg.muted"
															bg="transparent"
															size="sm"
															width="full"
															_hover={{
																borderColor: "red.500",
																color: "red.500",
																bg: "transparent",
															}}
															onClick={() => reject(invitation.id)}
														>
															Reject
														</Button>
													</Flex>
												</Flex>
											))}
										</Flex>
									)}
								</Dialog.Body>
								<Dialog.CloseTrigger asChild>
									<Button variant="ghost" size="sm" aria-label="Close" />
								</Dialog.CloseTrigger>
							</Dialog.Content>
						</Dialog.Positioner>
					</Dialog.Root>

					<InfoCallout
						title="Team Information"
						body={
							<Box spaceY="0.5rem">
								<Text color="fg.muted" fontSize="sm">
									Create or join a team to participate in SpurHacks. Teams can
									have up to 4 members total.
								</Text>
								<Text color="fg.muted" fontSize="sm">
									Team names can be changed until registration closes, so feel
									free to experiment!
								</Text>
							</Box>
						}
					/>
				</Flex>
			)}
		</PageWrapper>
	);
};
