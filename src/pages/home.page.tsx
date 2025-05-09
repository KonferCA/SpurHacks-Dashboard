import DiscordLogo from "@/assets/discord.svg";
import InstagramLogo from "@/assets/instagram.svg";
import LinkedinLogo from "@/assets/linkedin.svg";
import TiktokLogo from "@/assets/tiktok.svg";
import { useApplications } from "@/hooks/use-applications";
import { paths } from "@/providers/RoutesProvider/data";
import { getTypeforms } from "@/services/firebase/misc";
import {
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
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
	const { deadlines, applications } = useApplications();
	const navigate = useNavigate();

	const hasApplied = useMemo(() => {
		const app = applications.find((app) => app.hackathonYear === "2025");
		return app && app.applicationStatus === "pending";
	}, [applications]);

	const { data: typeforms, isLoading: isLoadingTypeforms } = useQuery({
		queryKey: ["typeforms"],
		queryFn: getTypeforms,
	});

	const cardStyles = useMemo(() => {
		if (typeforms && typeforms.mjvURL) {
			return {
				maxWidth: { base: "none", xl: "300px" },
				width: "full",
				rounded: "4xl",
			};
		}

		return {
			maxWidth: { base: "none", md: "300px" },
			width: "full",
			rounded: "4xl",
		};
	}, [typeforms]);

	return (
		<PageWrapper>
			<Box as="section" spaceY="1.5rem">
				<Flex gap="1.5rem" flexWrap={{ base: "wrap", xl: "nowrap" }}>
					<Card.Root {...cardStyles}>
						<Card.Header>
							<Card.Title>Hacker Status</Card.Title>
						</Card.Header>
						<Card.Body>
							{/* <Heading mb="1rem">Hacker Status</Heading> */}
							{deadlines.inRange && (
								<Box spaceY="1rem">
									<Flex alignItems="center" gapX="1rem">
										<Text color="fg.muted">
											{hasApplied
												? "Application submitted"
												: "Application not submitted"}
										</Text>
										<Icon
											size="lg"
											color={hasApplied ? "green.400" : "yellow.400"}
										>
											{hasApplied ? <CheckCircle /> : <WarningCircle />}
										</Icon>
									</Flex>
								</Box>
							)}
							{deadlines.beforeStart && (
								<Box>
									<Text>
										Applications for SpurHacks 2025 open on{" "}
										{deadlines.startDateStr}.
									</Text>
								</Box>
							)}
							{deadlines.afterClose && (
								<Box>
									<Text>Applications have now closed for SpurHacks 2025.</Text>
								</Box>
							)}
						</Card.Body>
						<Card.Footer>
							{!hasApplied && (
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
						</Card.Footer>
					</Card.Root>

					{!isLoadingTypeforms && typeforms?.mjvURL && (
						<Card.Root
							maxWidth={{ base: "none", xl: "600px" }}
							width="full"
							rounded="4xl"
						>
							<Card.Header>
								<Card.Title>
									Join us as a Mentor, Judge, or Volunteer!
								</Card.Title>
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
									href={typeforms.mjvURL}
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
					)}
				</Flex>
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
			</Box>
		</PageWrapper>
	);
};

export { HomePage };
