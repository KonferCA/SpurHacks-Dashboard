import DiscordLogo from "@/assets/discord.svg";
import InstagramLogo from "@/assets/instagram.svg";
import LinkedinLogo from "@/assets/linkedin.svg";
import TiktokLogo from "@/assets/tiktok.svg";
import { useApplications } from "@/hooks/use-applications";
import { paths } from "@/providers/RoutesProvider/data";
import {
	Badge,
	Box,
	Button,
	Card,
	Link as ChakraLink,
	Flex,
	Heading,
	Icon,
	Image,
	Link,
	Text,
} from "@chakra-ui/react";
import { PageWrapper } from "@components";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";

const importantInfo = [
	{ day: "FRI", time: "7:00PM", label: "Opening Ceremony" },
	{ day: "SUN", time: "9:00AM", label: "Projects Due" },
	{ day: "SUN", time: "5:00PM", label: "Closing Ceremony" },
];

const cardStyles = {
	maxWidth: { base: "none", xl: "450px" },
	width: "full",
	rounded: "4xl",
};

const HomePage = () => {
	const { deadlines, current: currentApplication } = useApplications();
	const navigate = useNavigate();

	return (
		<PageWrapper>
			<Box as="section" spaceY="1.5rem">
				<Flex gap="1.5rem" flexWrap={{ base: "wrap", xl: "nowrap" }}>
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
										<Flex alignItems="center" gapX="1rem">
											<Text color="fg.muted">
												{!!currentApplication
													? "Application submitted"
													: "Application not submitted"}
											</Text>
											<Icon
												size="lg"
												color={
													!!currentApplication ? "green.400" : "yellow.400"
												}
											>
												{!!currentApplication ? (
													<CheckCircle />
												) : (
													<WarningCircle />
												)}
											</Icon>
										</Flex>
										<Text color="fg.muted">
											{!!currentApplication
												? "You’ll receive a confirmation on your application status in the email you provided."
												: "Bring your ideas to life, build something bold, and collaborate with passionate peers! All skill levels are welcome."}
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
										{!!currentApplication &&
											currentApplication.applicationStatus === "accepted" &&
											!currentApplication.rsvp && (
												<Box spaceY="1rem">
													<Flex alignItems="center" gapX="1rem">
														<Text color="fg.muted">
															Congrats, you’re in! Make sure to RSVP to claim
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
										{!!currentApplication &&
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
								{deadlines.afterClose &&
									!!currentApplication &&
									currentApplication.applicationStatus === "accepted" &&
									!currentApplication.rsvp && (
										<Button
											color="black"
											colorScheme="brand"
											onClick={() => console.log("not implemented")}
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
								you’re sharing your expertise or lending a hand, your
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

					{currentApplication?.rsvp && (
						<Card.Root
							maxWidth={{ base: "none", xl: "600px" }}
							width={{ base: "full" }}
							rounded="4xl"
						>
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
				</Flex>

				<Flex gap="1.5rem" flexWrap={{ base: "wrap", xl: "nowrap" }}>
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

					<Card.Root {...cardStyles}>
						<Card.Header>
							<Heading>Stay Connected</Heading>
						</Card.Header>
						<Card.Body>
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
						</Card.Body>
					</Card.Root>
				</Flex>
			</Box>
		</PageWrapper>
	);
};

export { HomePage };
