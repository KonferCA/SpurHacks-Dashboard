import DiscordLogo from "@/assets/discord.svg";
import InstagramLogo from "@/assets/instagram.svg";
import LinkedinLogo from "@/assets/linkedin.svg";
import TiktokLogo from "@/assets/tiktok.svg";
import { useApplications } from "@/hooks/use-applications";
import { useUser } from "@/providers";
import { paths } from "@/providers/RoutesProvider/data";
import {
	Box,
	Button,
	Card,
	Flex,
	Heading,
	Icon,
	Image,
	Link,
	Spinner,
	Text,
} from "@chakra-ui/react";
import { PageWrapper } from "@components";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
	const { deadlines, applications, isLoading } = useApplications();
	const { isLoading: userLoading } = useUser();
	const navigate = useNavigate();

	const hasApplied = useMemo(() => {
		const app = applications.find((app) => app.hackathonYear === "2025");
		return app && app.applicationStatus === "pending";
	}, [applications]);

	// Calculate what status to display
	const showApplicationStatus = useMemo(() => {
		return !userLoading && !isLoading && deadlines.inRange;
	}, [userLoading, isLoading, deadlines.inRange]);

	const showBeforeStart = useMemo(() => {
		return !userLoading && !isLoading && deadlines.beforeStart;
	}, [userLoading, isLoading, deadlines.beforeStart]);

	const showAfterClose = useMemo(() => {
		return !userLoading && !isLoading && deadlines.afterClose;
	}, [userLoading, isLoading, deadlines.afterClose]);

	return (
		<PageWrapper>
			<Box as="section" spaceY="1.5rem">
				<Card.Root
					bg="transparent"
					borderRadius="32px"
					borderColor={"#1F1E2E"}
					maxWidth="400px"
				>
					<Card.Body>
						<Heading mb="1rem">Hacker Status</Heading>
						{(isLoading || userLoading) && (
							<Flex justify="center" align="center" p={4}>
								<Spinner color="brand.500" />
							</Flex>
						)}
						{showApplicationStatus && (
							<Box spaceY="1rem">
								<Flex alignItems="center" gapX="1rem">
									<Text color="#666484">
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
								{!hasApplied && (
									<Flex justifyContent="end">
										<Button
											color="black"
											colorScheme="brand"
											onClick={() => navigate(paths.apply)}
											size="lg"
											rounded="full"
											marginTop="1rem"
											textTransform="uppercase"
										>
											Apply Now
										</Button>
									</Flex>
								)}
							</Box>
						)}
						{showBeforeStart && (
							<Box>
								<Text>
									Applications for SpurHacks 2025 open on{" "}
									{deadlines.startDateStr}.
								</Text>
							</Box>
						)}
						{showAfterClose && (
							<Box>
								<Text>Applications have now closed for SpurHacks 2025.</Text>
							</Box>
						)}
					</Card.Body>
				</Card.Root>
				<Card.Root
					bg="transparent"
					borderRadius="32px"
					borderColor={"#1F1E2E"}
					maxWidth="400px"
				>
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
