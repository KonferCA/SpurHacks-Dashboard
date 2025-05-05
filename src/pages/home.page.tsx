import { useApplications } from "@/hooks/use-applications";
import { paths } from "@/providers/RoutesProvider/data";
import {
	Box,
	Button,
	Card,
	Flex,
	Heading,
	Icon,
	Link,
	Text,
} from "@chakra-ui/react";
import { PageWrapper } from "@components";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
	WarningCircle,
	DiscordLogo,
	InstagramLogo,
	LinkedinLogo,
	TiktokLogo,
	CheckCircle,
} from "@phosphor-icons/react";

const HomePage = () => {
	const { deadlines, applications } = useApplications();
	const navigate = useNavigate();

	const hasApplied = useMemo(() => {
		const app = applications.find((app) => app.hackathonYear === "2025");
		return !!app;
	}, [applications]);

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
						{deadlines.inRange && (
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
								<Icon size="2xl">
									<InstagramLogo />
								</Icon>
							</Link>
							<Link
								href="https://www.linkedin.com/company/spurhacks"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Icon size="2xl">
									<LinkedinLogo />
								</Icon>
							</Link>
							<Link
								href="https://www.tiktok.com/@spur_hacks"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Icon size="2xl">
									<TiktokLogo />
								</Icon>
							</Link>
							<Link
								href="https://discord.spurhacks.com"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Icon size="2xl">
									<DiscordLogo />
								</Icon>
							</Link>
						</Flex>
					</Card.Body>
				</Card.Root>
			</Box>
		</PageWrapper>
	);
};

export { HomePage };
