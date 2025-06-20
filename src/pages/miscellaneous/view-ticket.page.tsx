import { LoadingAnimation, PageWrapper } from "@/components";
import { toaster } from "@/components/ui/toaster";
import { useAuth } from "@/providers";
import { getProfilePictureURL, getResume } from "@/services/firebase/files";
import { getTicketData } from "@/services/firebase/ticket";
import type { TicketData } from "@/services/firebase/types";
import {
	Badge,
	Box,
	Button,
	Card,
	Flex,
	Heading,
	Icon,
	Image,
	Link,
	Text,
	VStack,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import {
	FaDownload,
	FaExternalLinkAlt,
	FaGlobe,
} from "react-icons/fa";
import { Navigate, useNavigate, useParams } from "react-router-dom";

type SocialKey = "linkedin" | "instagram" | "github" | "discord";

const socialInfo: Record<
	SocialKey,
	{ name: string; iconSrc: string; color: string; baseUrl?: string }
> = {
	linkedin: {
		name: "LinkedIn",
		iconSrc: "/socialIcons/linkedin.svg",
		color: "#0077B5",
		baseUrl: "https://linkedin.com/in/",
	},
	instagram: {
		name: "Instagram",
		iconSrc: "/socialIcons/instagram.svg",
		color: "#E4405F",
		baseUrl: "https://instagram.com/",
	},
	github: {
		name: "GitHub",
		iconSrc: "/socialIcons/github.png",
		color: "#333",
		baseUrl: "https://github.com/",
	},
	discord: {
		name: "Discord",
		iconSrc: "/socialIcons/discord.svg",
		color: "#5865F2",
	},
};

export const ViewTicketPage = () => {
	const [isLoading, setIsLoading] = useState(true);
	const { ticketId } = useParams();
	const navigate = useNavigate();
	const { currentUser } = useAuth();
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const [ticketData, setTicketData] = useState<TicketData | null>(null);
	const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
		null,
	);
	const [failedProfilePicture, setFailedProfilePicture] = useState(false);
	const [failedProviderPicture, setFailedProviderPicture] = useState(false);
	const [showResume, setShowResume] = useState(false);

	useEffect(() => {
		if (!ticketId) {
			setIsLoading(false);
			return;
		}

		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		timeoutRef.current = setTimeout(() => {
			if (isLoading) {
				setIsLoading(false);
				toaster.error({
					title: "Request Timed Out",
					description: "Could not fetch ticket data.",
				});
			}
		}, 5000);

		const fetchTicket = async () => {
			if (
				currentUser &&
				(currentUser.hawkAdmin ||
					(currentUser.type === "volunteer" && currentUser.rsvpVerified))
			) {
				navigate(`/admin/ticket/${ticketId}`);
				return;
			}

			try {
				const res = await getTicketData(ticketId);
				if (res.status === 200) {
					const data = res.data as any;
					setTicketData(data);
					setShowResume(
						!data.resumeVisibility ||
							data.resumeVisibility === "Public" ||
							(data.resumeVisibility === "Sponsors Only" &&
								currentUser !== null &&
								currentUser.type === "sponsor"),
					);

					if (data.profilePictureRef) {
						try {
							const url = await getProfilePictureURL(data.profilePictureRef);
							setProfilePictureUrl(url);
						} catch (e) {
							console.error("Failed to load profile picture", e);
							setProfilePictureUrl(null);
						}
					}
				} else {
					toaster.error({
						title: "Failed to load ticket",
						description: res.message,
					});
				}
			} catch (error) {
				toaster.error({
					title: "An Error Occurred",
					description: "Could not process ticket information.",
				});
			} finally {
				setIsLoading(false);
				if (timeoutRef.current) clearTimeout(timeoutRef.current);
			}
		};

		fetchTicket();

		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, [currentUser, ticketId, navigate]);

	if (isLoading) return <LoadingAnimation />;

	if (!ticketId) return <Navigate to="/not-found" />;
	if (!ticketData) {
		return (
			<PageWrapper>
				<Flex direction="column" align="center" justify="center" minH="50vh">
					<Heading>Ticket Not Found</Heading>
					<Text mt={4}>
						The ticket you are looking for does not exist or could not be
						loaded.
					</Text>
					<Button mt={6} onClick={() => navigate("/home")}>
						Go to Dashboard
					</Button>
				</Flex>
			</PageWrapper>
		);
	}

	const formatSocialValue = (_: string, value: string) => {
		// remove common prefixes
		const cleanValue = value
			.replace(/^https?:\/\/(www\.)?/, "")
			.replace(/^(instagram\.com\/|github\.com\/|linkedin\.com\/in\/)/, "")
			.replace(/\/$/, "");
		return cleanValue;
	};

	const getSocialUrl = (socialConfig: any, value: string) => {
		if (!value) return "#";
		if (value.startsWith("http")) return value;
		if (socialConfig.baseUrl) {
			const cleanValue = formatSocialValue(socialConfig.key, value);
			return `${socialConfig.baseUrl}${cleanValue}`;
		}
		return `https://${value}`;
	};

	const extendedData = ticketData as any;
	const aboutMe = extendedData?.aboutMe;
	const website = extendedData?.website;

	const socialLinks = Object.entries(ticketData)
		.filter(
			([key, value]) => socialInfo[key as SocialKey] && typeof value === "string" && value,
		)
		.map(([key, value]) => ({
			...(socialInfo[key as SocialKey]),
			key: key as SocialKey,
			value: value as string,
		}));

	return (
		<PageWrapper>
			<Flex direction="column" maxW="500px" gap={6}>
				<Card.Root rounded="4xl" bg="#1F1E2E" overflow="hidden">
					<Card.Header>
						<Flex align="center" gap={4}>
							<Box
								boxSize="80px"
								borderRadius="full"
								bg="gray.600"
								display="flex"
								alignItems="center"
								justifyContent="center"
								overflow="hidden"
								flexShrink={0}
							>
								{profilePictureUrl && !failedProfilePicture ? (
									<Image
										src={profilePictureUrl}
										alt="Profile Picture"
										boxSize="full"
										borderRadius="full"
										objectFit="cover"
										onError={() => setFailedProfilePicture(true)}
									/>
								) : extendedData.providerPhotoURL && !failedProviderPicture ? (
									<Image
										src={extendedData.providerPhotoURL}
										alt="Profile Picture"
										boxSize="full"
										borderRadius="full"
										objectFit="cover"
										onError={() => setFailedProviderPicture(true)}
									/>
								) : (
									<Box
										boxSize="full"
										bg="gray.600"
										display="flex"
										alignItems="center"
										justifyContent="center"
										color="gray.300"
										fontSize="xl"
										fontWeight="bold"
									>
										{ticketData.firstName.charAt(0)}
										{ticketData.lastName.charAt(0)}
									</Box>
								)}
							</Box>
							<Box>
								<Heading size="lg">
									{ticketData.firstName} {ticketData.lastName}
								</Heading>
								{ticketData.pronouns && (
									<Badge
										bg="bg.hover"
										borderStyle="none"
										color="fg.muted"
										size="lg"
										rounded="full"
										px={3}
										py={1}
										mt={1}
									>
										{ticketData.pronouns}
									</Badge>
								)}
							</Box>
						</Flex>
					</Card.Header>

					<Card.Body>
						<VStack gap={8} align="stretch">
							{aboutMe && (
								<Box>
									<Heading
										size="md"
										color="fg.muted"
										textTransform="uppercase"
										mb={3}
									>
										About Me
									</Heading>
									<Text color="white" lineHeight="1.6">{aboutMe}</Text>
								</Box>
							)}

							<Box>
								<Heading
									size="md"
									color="fg.muted"
									textTransform="uppercase"
									mb={3}
								>
									Connections
								</Heading>
								{socialLinks.length > 0 ? (
									<Flex direction="column" gap={3}>
										{socialLinks.map((social) => (
											<Flex
												key={social.key}
												justify="space-between"
												align="center"
												py={3}
												px={4}
												bg="#2D2A3D"
												borderRadius="2xl"
											>
												<Flex align="center" gap={3}>
													<Box
														boxSize="40px"
														display="flex"
														alignItems="center"
														justifyContent="center"
														flexShrink={0}
													>
														<Image 
															src={social.iconSrc} 
															alt={social.name} 
															boxSize="32px"
														/>
													</Box>
													<Box>
														<Text fontWeight="medium" color="white">
															{social.name}
														</Text>
														<Text
															color="fg.muted"
															fontSize="sm"
															overflow="hidden"
															textOverflow="ellipsis"
															whiteSpace="nowrap"
															maxWidth={{ base: "150px", md: "200px" }}
														>
															{formatSocialValue(social.key, social.value)}
														</Text>
													</Box>
												</Flex>
												{social.key !== "discord" && (
													<Link
														href={getSocialUrl(social, social.value)}
														target="_blank"
														rel="noopener noreferrer"
													>
														<Icon
															as={FaExternalLinkAlt}
															fontSize="lg"
															color="fg.muted"
															_hover={{ color: "white" }}
														/>
													</Link>
												)}
											</Flex>
										))}
									</Flex>
								) : (
									<Text color="fg.muted">No social links provided.</Text>
								)}
							</Box>

							<Box>
								<Heading
									size="md"
									color="fg.muted"
									textTransform="uppercase"
									mb={3}
								>
									Portfolio
								</Heading>
								<Flex direction="column" gap={3}>
									{website && (
										<Link href={getSocialUrl({key: "website"}, website)} target="_blank" rel="noopener noreferrer" _hover={{textDecoration: "none"}}>
										<Flex
											justify="space-between"
											align="center"
											py={3}
											px={4}
											bg="#2D2A3D"
											borderRadius="2xl"
											w="full"
										>
											<Flex align="center" gap={3}>
												<Box
													boxSize="40px"
													display="flex"
													alignItems="center"
													justifyContent="center"
													flexShrink={0}
													borderRadius="lg"
													bg="#0891b2"
												>
													<Icon as={FaGlobe} color="white" fontSize="xl" />
												</Box>
												<Box>
													<Text fontWeight="medium" color="white">
														Website
													</Text>
													<Text
														color="fg.muted"
														fontSize="sm"
														overflow="hidden"
														textOverflow="ellipsis"
														whiteSpace="nowrap"
														maxWidth={{ base: "150px", md: "200px" }}
													>
														{formatSocialValue("website", website)}
													</Text>
												</Box>
											</Flex>
											<Icon
												as={FaExternalLinkAlt}
												fontSize="lg"
												color="fg.muted"
												_hover={{ color: "white" }}
											/>
										</Flex>
										</Link>
									)}
									{ticketData.resumeRef && showResume && (
										<Flex
											as="button"
											onClick={() => ticketData.resumeRef && getResume(ticketData.resumeRef)}
											justify="space-between"
											align="center"
											py={3}
											px={4}
											bg="#2D2A3D"
											borderRadius="2xl"
											w="full"
										>
											<Flex align="center" gap={3}>
												<Box
													boxSize="40px"
													display="flex"
													alignItems="center"
													justifyContent="center"
													flexShrink={0}
													borderRadius="lg"
													bg="#dc2626"
												>
													<Text color="white" fontSize="xs" fontWeight="bold">
														PDF
													</Text>
												</Box>
												<Box textAlign="left">
													<Text fontWeight="medium" color="white">
														Resume
													</Text>
													<Text color="fg.muted" fontSize="sm">
														Click to download
													</Text>
												</Box>
											</Flex>
											<Icon
												as={FaDownload}
												fontSize="lg"
												color="fg.muted"
												_hover={{ color: "white" }}
											/>
										</Flex>
									)}
									{!website && (!ticketData.resumeRef || !showResume) && (
										<Text color="fg.muted">No portfolio items available.</Text>
									)}
								</Flex>
							</Box>
						</VStack>
					</Card.Body>
				</Card.Root>
			</Flex>
		</PageWrapper>
	);
};
