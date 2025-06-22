import DiscordLogo from "@/assets/discord.svg";
import InstagramLogo from "@/assets/instagram.svg";
import LinkedinLogo from "@/assets/linkedin.svg";
import TiktokLogo from "@/assets/tiktok.svg";
import { toaster } from "@/components/ui/toaster";
import { faqs } from "@/data";
import { useApplications } from "@/hooks/use-applications";
import { useDeadlines } from "@/hooks/use-deadlines";
import { paths } from "@/providers/RoutesProvider/data";
import { verifyRSVP, withdrawRSVP } from "@/services/firebase/rsvp";
import {
	Accordion,
	Badge,
	Box,
	Button,
	Card,
	Link as ChakraLink,
	CloseButton,
	Dialog,
	Flex,
	Heading,
	Icon,
	Image,
	Link,
	Text,
} from "@chakra-ui/react";
import { PageWrapper } from "@components";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const importantInfo = [
	{ day: "FRI", time: "5:00PM", label: "Registration" },
	{ day: "FRI", time: "8:30PM", label: "Opening Ceremony" },
	{ day: "SUN", time: "11:00AM", label: "Projects Due" },
	{ day: "SUN", time: "6:00PM", label: "Closing Ceremony" },
];

const cardStyles = {
	maxWidth: { base: "none", xl: "450px" },
	width: "full",
	rounded: "4xl",
};

const HomePage = () => {
	const { current: currentApplication, refreshApplications } =
		useApplications();
	const { deadlines } = useDeadlines();
	const navigate = useNavigate();
	const [isRSVPLoading, setIsRSVPLoading] = useState(false);
	const [openRevokeRSVPDialog, setOpenRevokeRSVPDialog] = useState(false);

	const handleRSVP = async () => {
		try {
			setIsRSVPLoading(true);
			await verifyRSVP();
			await refreshApplications();
		} catch (error) {
			console.error(error);
			const msg =
				(error as Error).message ??
				"Oops, something went wrong when trying to RSVP. Please try again later. If problem persists, contact us in Discord.";
			toaster.error({
				title: "Failed to RSVP",
				description: msg,
			});
		} finally {
			setIsRSVPLoading(false);
		}
	};

	const handleRevokeRSVP = async () => {
		try {
			setIsRSVPLoading(true);
			await withdrawRSVP();
			await refreshApplications();
		} catch (error) {
			console.error(error);
			const msg =
				(error as Error).message ??
				"Oops, something went wrong when trying to revoke RSVP. Please try again later. If the problem persists, contact us in Discord.";
			toaster.error({
				title: "Failed to revoke RSVP",
				description: msg,
			});
		} finally {
			if (openRevokeRSVPDialog) setOpenRevokeRSVPDialog(false);
			setIsRSVPLoading(false);
		}
	};

	return (
		<PageWrapper>
			<Box as="section" spaceY="1.5rem">
				<Flex gap={6} flexWrap={{ base: "wrap", xl: "nowrap" }}>
					{/* Only render if no submission or application status is not accepted and has not rsvp'd */}
					{(!currentApplication ||
						currentApplication.applicationStatus !== "accepted" ||
						!currentApplication.rsvp) && (
						<Card.Root {...cardStyles}>
							<Card.Header flexDir="row" justifyContent="space-between">
								<Card.Title>Hacker Status</Card.Title>
								{!!currentApplication &&
									currentApplication.applicationStatus !== "rejected" && (
										<Badge
											bg={
												currentApplication.applicationStatus === "pending"
													? "bg.hover"
													: "transparent"
											}
											borderStyle={
												currentApplication.applicationStatus === "pending"
													? "none"
													: "solid"
											}
											borderWidth="2px"
											borderColor={
												currentApplication.applicationStatus === "pending"
													? "transparent"
													: "green.400"
											}
											color={
												currentApplication.applicationStatus === "pending"
													? "fg.muted"
													: "green.400"
											}
											size="lg"
											rounded="full"
											textTransform="uppercase"
										>
											{currentApplication.applicationStatus}
										</Badge>
									)}
							</Card.Header>
							<Card.Body>
								{deadlines.inRange && (
									<Box spaceY="1rem">
										<Flex alignItems="center" gapX={4}>
											<Text color="fg.muted">
												{currentApplication
													? "Application submitted"
													: "Application not submitted"}
											</Text>
											<Icon
												size="lg"
												color={currentApplication ? "green.400" : "yellow.400"}
											>
												{currentApplication ? (
													<CheckCircle />
												) : (
													<WarningCircle />
												)}
											</Icon>
										</Flex>
										<Text color="fg.muted">
											{!currentApplication &&
												"Bring your ideas to life, build something bold, and collaborate with passionate peers! All skill levels are welcome."}
											{currentApplication &&
												currentApplication.applicationStatus !== "accepted" &&
												"You'll receive a confirmation on your application status in the email you provided."}
											{currentApplication &&
												currentApplication.applicationStatus === "accepted" &&
												!currentApplication.rsvp &&
												"Congrats, you're in! Make sure to RSVP to claim your spot!"}
										</Text>
									</Box>
								)}
								{deadlines.afterClose && (
									<Box>
										{!currentApplication && (
											<Text color="fg.muted">
												Applications have now closed for SpurHacks 2025.
											</Text>
										)}
										{currentApplication &&
											currentApplication.applicationStatus === "accepted" &&
											!currentApplication.rsvp && (
												<Box spaceY="1rem">
													<Flex alignItems="center" gapX={4}>
														<Text color="fg.muted">
															Congrats, you're in! Make sure to RSVP to claim
															your spot!
														</Text>
														<Icon size="lg" color="green.400">
															<CheckCircle />
														</Icon>
													</Flex>
													<Text color="fg.muted">
														See you at SpurHacks 2025 :)
													</Text>
												</Box>
											)}
										{currentApplication &&
											currentApplication.applicationStatus !== "accepted" && (
												<Box spaceY="1rem">
													<Text color="fg.muted">
														Thank you for applying to SpurHacks 2025. We were
														impressed with your application, but we are unable
														to offer a hacker acceptance at this time.
													</Text>
													<Text color="fg.muted">We wish you the best!</Text>
												</Box>
											)}
									</Box>
								)}
							</Card.Body>
							<Card.Footer>
								{deadlines.inRange && !currentApplication && (
									<Button
										color="black"
										colorScheme="brand"
										onClick={() => navigate(paths.apply)}
										marginLeft="auto"
										size="lg"
										rounded="full"
										marginTop="1rem"
										textTransform="uppercase"
									>
										Apply Now
									</Button>
								)}
								{currentApplication &&
									currentApplication.applicationStatus === "accepted" &&
									!currentApplication.rsvp && (
										<Button
											loading={isRSVPLoading}
											color="black"
											colorScheme="brand"
											onClick={handleRSVP}
											marginLeft="auto"
											size="lg"
											rounded="full"
											marginTop="1rem"
											textTransform="uppercase"
										>
											RSVP
										</Button>
									)}
							</Card.Footer>
						</Card.Root>
					)}

					{currentApplication?.rsvp && (
						<Card.Root {...cardStyles}>
							<Card.Header>
								<Card.Title>RSVP Status</Card.Title>
							</Card.Header>
							<Card.Body>
								<Text color="fg.muted">
									You've RSVP'd your spot!{" "}
									<Icon size="md" color="green.400">
										<CheckCircle />
									</Icon>
								</Text>
								<div>
									<Dialog.Root
										role="alertdialog"
										open={openRevokeRSVPDialog}
										onOpenChange={(e) => setOpenRevokeRSVPDialog(e.open)}
									>
										<Dialog.Trigger asChild>
											<Button
												loading={isRSVPLoading}
												mt={4}
												ml="auto"
												display="block"
												textTransform="uppercase"
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
											>
												Revoke rsvp
											</Button>
										</Dialog.Trigger>
										<Dialog.Backdrop />
										<Dialog.Positioner>
											<Dialog.Content>
												<Dialog.Header>
													<Dialog.Title>Are you sure you?</Dialog.Title>
												</Dialog.Header>
												<Dialog.Body>
													<Text>
														Are you sure you want to revoke RSVP? This will not
														affect your application status.
													</Text>
												</Dialog.Body>
												<Dialog.Footer>
													<Dialog.ActionTrigger asChild>
														<Button rounded="full">Cancel</Button>
													</Dialog.ActionTrigger>
													<Button
														loading={isRSVPLoading}
														mt={4}
														ml="auto"
														display="block"
														textTransform="uppercase"
														variant="outline"
														rounded="full"
														borderColor="fg.muted"
														borderWidth="2px"
														color="fg.muted"
														_hover={{
															borderColor: "red.500",
															color: "red.500",
															bg: "transparent",
														}}
														onClick={handleRevokeRSVP}
													>
														revoke rsvp
													</Button>
												</Dialog.Footer>
												<Dialog.CloseTrigger asChild>
													<CloseButton size="sm" />
												</Dialog.CloseTrigger>
											</Dialog.Content>
										</Dialog.Positioner>
									</Dialog.Root>
								</div>
							</Card.Body>
						</Card.Root>
					)}

					<Card.Root
						maxWidth={{ base: "none", xl: "450px" }}
						width="full"
						rounded="4xl"
					>
						<Card.Header>
							<Card.Title>FAQ</Card.Title>
						</Card.Header>
						<Card.Body>
							<Text color="fg.muted" mb="1rem" fontSize="sm">
								Quick answers to common questions.
							</Text>
							<Box maxHeight="290px" overflowY="auto">
								<Accordion.Root collapsible multiple>
									{faqs.map((faq, index) => (
										<Accordion.Item key={index} value={`item-${index}`}>
											<Accordion.ItemTrigger>
												<Text fontWeight="medium" fontSize="sm">
													{faq.question}
												</Text>
												<Accordion.ItemIndicator />
											</Accordion.ItemTrigger>
											<Accordion.ItemContent>
												<Accordion.ItemBody>
													<Text color="fg.muted" fontSize="sm">
														{faq.answer}
													</Text>
												</Accordion.ItemBody>
											</Accordion.ItemContent>
										</Accordion.Item>
									))}
								</Accordion.Root>
							</Box>
						</Card.Body>
					</Card.Root>
				</Flex>
				{currentApplication?.rsvp && (
					<Card.Root maxWidth={{ base: "none", xl: "600px" }} rounded="4xl">
						<Card.Header>
							<Card.Title>Important Info</Card.Title>
						</Card.Header>
						<Card.Body>
							<Flex direction="column" gap={4}>
								{importantInfo.map(({ day, time, label }) => (
									<Flex key={label} align="center" gap={6}>
										<Flex
											px={4}
											py={2}
											borderWidth={1}
											borderColor="#FFA75F"
											rounded="full"
											fontSize="sm"
											justify="space-between"
											w="130px"
										>
											<Text>{day}</Text>
											<Text>{time}</Text>
										</Flex>
										<Text color="gray.200" fontSize="sm">
											{label}
										</Text>
									</Flex>
								))}
							</Flex>
						</Card.Body>
					</Card.Root>
				)}
				<Flex gap={6} flexWrap={{ base: "wrap", xl: "nowrap" }}>
					<Card.Root
						maxWidth={{ base: "none", xl: "600px" }}
						width="full"
						rounded="4xl"
					>
						<Card.Header>
							<Card.Title>Join us as a Mentor, Judge, or Volunteer!</Card.Title>
						</Card.Header>
						<Card.Body>
							<Text color="fg.muted" mb="1rem">
								Play a key role in helping the event run smoothly. Whether
								you're sharing your expertise or lending a hand, your
								contributions make a huge difference!
							</Text>
						</Card.Body>
						<Card.Footer>
							<ChakraLink
								href="https://talent.spurhacks.com"
								target="_blank"
								rel="noopener noreferrer"
								marginLeft="auto"
								rounded="full"
								bg="brand.primary"
								color="brand.contrast"
								py="2.5"
								px="5"
								textTransform="uppercase"
								transition="colors"
								_hover={{ textDecor: "none", bg: "brand.primary/90" }}
							>
								apply to join
							</ChakraLink>
						</Card.Footer>
					</Card.Root>

					<Card.Root
						maxWidth={{ base: "none", xl: "600px" }}
						width="full"
						rounded="4xl"
					>
						<Card.Header>
							<Card.Title>Traveling to SpurHacks? Let us help!</Card.Title>
						</Card.Header>
						<Card.Body>
							<Text color="fg.muted" mb="1rem">
								We appreciate your commitment towards attending SpurHacks. If
								you need travel accomodations, reimbursements, or other
								inquiries, let us know!
							</Text>
						</Card.Body>
						<Card.Footer>
							<ChakraLink
								href="https://travel.spurhacks.com"
								target="_blank"
								rel="noopener noreferrer"
								marginLeft="auto"
								rounded="full"
								bg="brand.primary"
								color="brand.contrast"
								py="2.5"
								px="5"
								textTransform="uppercase"
								transition="colors"
								_hover={{ textDecor: "none", bg: "brand.primary/90" }}
							>
								submit application
							</ChakraLink>
						</Card.Footer>
					</Card.Root>
				</Flex>

				<Card.Root {...cardStyles}>
					<Card.Header>
						<Heading>Stay Connected</Heading>
					</Card.Header>
					<Card.Body>
						<Text color="fg.muted">
							Follow us on our socials! Get the latest updates about our current
							and future events.
						</Text>
					</Card.Body>
					<Card.Footer>
						<Flex alignItems="center" gap="1rem">
							<Link
								href="https://www.instagram.com/spurhacks/"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Image src={InstagramLogo} width="1.5rem" height="1.5rem" />
							</Link>
							<Link
								href="https://www.linkedin.com/company/spurhacks"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Image src={LinkedinLogo} width="1.5rem" height="1.5rem" />
							</Link>
							<Link
								href="https://www.tiktok.com/@spur_hacks"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Image src={TiktokLogo} width="1.5rem" height="1.5rem" />
							</Link>
							<Link
								href="https://discord.gg/NpnSUrZJQy"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Image src={DiscordLogo} width="1.5rem" height="1.5rem" />
							</Link>
						</Flex>
					</Card.Footer>
				</Card.Root>
			</Box>
		</PageWrapper>
	);
};

export { HomePage };
