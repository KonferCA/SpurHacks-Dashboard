import { PageWrapper } from "@/components";
import { InfoCallout } from "@/components/InfoCallout/InfoCallout";
import { toaster } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/providers";
import {
	createTeam,
	deleteTeam,
	getInvitations,
	getTeam,
	inviteMember,
	isTeamNameAvailable,
	rejectInvitation,
	removeMembers,
	updateTeamName,
	validateTeamInvitation,
} from "@/services/firebase/teams";
import type { Invitation } from "@/services/firebase/types";
import { useUserStore } from "@/stores/user.store";
import { getProfilePictureURL } from "@/services/firebase/files";
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
	Input,
	Text,
	Image,
	useDisclosure,
} from "@chakra-ui/react";
import { type FormEventHandler, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
	FaCheck,
	FaClock,
	FaCrown,
	FaEdit,
	FaPlus,
	FaTimes,
	FaTrash,
} from "react-icons/fa";
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
	const [invalidEmailMsg] = useState("");
	const [email, setEmail] = useState("");
	const [disableAllActions, setDisableAllActions] = useState(false);
	const [isEditingTeamName, setIsEditingTeamName] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState("");
	// holds ths emails of the members to be removed
	const [toBeRemovedTeammates, setToBeRemovedTeammates] = useState<string[]>(
		[],
	);
	// holds profile picture URLs for team members
	const [memberProfilePictures, setMemberProfilePictures] = useState<Record<string, string | null>>({});
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
		onOpen: onTeammatesOpen,
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
		setIsLoading(true);
		// do not allow to send another invitation to someone who is already in the team
		if (team?.members?.some((m) => m.email === email)) return;
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
							setMemberProfilePictures(prev => ({
								...prev,
								[data.email]: url
							}));
						} catch (e) {
							console.error("Failed to get profile picture URL for new member:", e);
							setMemberProfilePictures(prev => ({
								...prev,
								[data.email]: null
							}));
						}
					} else {
						setMemberProfilePictures(prev => ({
							...prev,
							[data.email]: null
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
				setMemberProfilePictures(prev => {
					const updated = { ...prev };
					toBeRemovedTeammates.forEach(email => {
						delete updated[email];
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
							console.error(`Failed to get profile picture URL for ${member.email}:`, e);
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
						<Flex direction="column" gap={6}>
							<Card.Root rounded="4xl">
								<CardHeader>
									<Flex justify="space-between" align="center" w="full">
										<Heading size="md">My Team</Heading>
										{team.isOwner && (
											<Button
												variant="outline"
												rounded="full"
												borderColor="fg.muted"
												borderWidth="2px"
												color="fg.muted"
												bg="transparent"
												size="sm"
												_hover={{
													borderColor: "red.500",
													color: "red.500",
													bg: "transparent",
												}}
												onClick={() => setConfirmDelete("delete")}
											>
												Delete Team
											</Button>
										)}
									</Flex>
								</CardHeader>
								<CardBody>
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
										<Flex align="center">
											<Heading size="md">{team.teamName}</Heading>
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
									)}
								</CardBody>
								{confirmDelete === "delete" && (
									<CardFooter>
										<Flex direction="column" gap={2}>
											<Text color="fg.muted" fontSize="sm">
												Are you sure you want to delete your team? This action
												is irreversible.
											</Text>
											<Flex mt={2} gap={2}>
												<Button
													variant="outline"
													rounded="full"
													borderColor="fg.muted"
													borderWidth="2px"
													color="fg.muted"
													bg="transparent"
													size="sm"
													_hover={{
														borderColor: "red.500",
														color: "red.500",
														bg: "transparent",
													}}
													onClick={handleDeleteTeam}
												>
													Yes, Delete
												</Button>
												<Button
													onClick={() => setConfirmDelete("")}
													variant="outline"
													rounded="full"
													size="sm"
												>
													Cancel
												</Button>
											</Flex>
										</Flex>
									</CardFooter>
								)}
							</Card.Root>

							<Card.Root rounded="4xl">
								<CardHeader>
									<Heading size="md">Team Members</Heading>
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
											<Flex
												key={member.email}
												justify="space-between"
												align="center"
												py={2}
												px={2}
											>
												<Flex align="center" gap={3}>
													{/* Profile Picture */}
													<Box
														boxSize="40px"
														borderRadius="full"
														bg="gray.600"
														display="flex"
														alignItems="center"
														justifyContent="center"
														overflow="hidden"
														flexShrink={0}
													>
														{memberProfilePictures[member.email] ? (
															<Image
																src={memberProfilePictures[member.email] as string}
																alt={`${member.firstName} ${member.lastName}`}
																boxSize="full"
																borderRadius="full"
																objectFit="cover"
															/>
														) : (
															<Box
																boxSize="full"
																bg="gray.600"
																display="flex"
																alignItems="center"
																justifyContent="center"
																color="gray.300"
																fontSize="sm"
																fontWeight="bold"
															>
																{member.firstName.charAt(0)}{member.lastName.charAt(0)}
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
														<Text color="fg.muted" fontSize="sm">
															{member.email}
														</Text>
													</Box>
												</Flex>
												<Badge
													bg={
														member.status === "pending"
															? "bg.hover"
															: "transparent"
													}
													borderStyle={
														member.status === "pending" ? "none" : "solid"
													}
													borderWidth="2px"
													borderColor={
														member.status === "pending"
															? "transparent"
															: "green.400"
													}
													color={
														member.status === "pending"
															? "fg.muted"
															: "green.400"
													}
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
											</Flex>
										))}
								</CardBody>
								<CardFooter flexWrap="wrap">
									<Flex gap={2} flexWrap="wrap">
										{team.isOwner && (
											<>
												<Button
													onClick={onInviteOpen}
													rounded="full"
													colorScheme="brand"
													color="black"
													size="sm"
												>
													<Icon as={FaPlus} mr={2} />
													Invite Members
												</Button>
												<Button
													onClick={onTeammatesOpen}
													rounded="full"
													variant="outline"
													size="sm"
												>
													<Icon as={FaTrash} mr={2} />
													Remove Members
												</Button>
											</>
										)}
										<Button
											onClick={onInvitationsOpen}
											rounded="full"
											variant="outline"
											size="sm"
										>
											<Icon as={FaCheck} mr={2} />
											View Invitations
										</Button>
									</Flex>
								</CardFooter>
							</Card.Root>
						</Flex>
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
