import { AppleWalletBadge, GoogleWalletBadge, LoadingDots } from "@/assets";
import { PageWrapper } from "@/components";
import { useApplications } from "@/hooks/use-applications";
import { useAuth } from "@/providers";
import { paths } from "@/providers/RoutesProvider/data";
import { logError } from "@/services/firebase/log";
import { OffwhiteLogo } from "@assets";
import { Box, Button, Flex, Image, Link, Text } from "@chakra-ui/react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export const MyTicketPage = () => {
	const functions = getFunctions();
	const { currentUser } = useAuth();
	const { applications } = useApplications();
	const userApp = applications[0] || null;
	const email = currentUser?.email ?? "";
	const firstName =
		(userApp?.firstName || currentUser?.displayName?.split(" ")[0]) ??
		"Unknown";
	const lastName =
		userApp?.lastName ||
		currentUser?.displayName?.split(" ")[1] ||
		currentUser?.type ||
		"Unknown";
	const [qrCode, setQRCode] = useState<string>(LoadingDots);
	const [loading, setLoading] = useState<boolean>(false);

	useEffect(() => {
		const qrCodeUrl = window.localStorage.getItem("qrCodeUrl");
		if (qrCodeUrl) {
			setQRCode(qrCodeUrl);
			window.localStorage.setItem("qrCodeUrl", qrCodeUrl);
		} else if (currentUser) {
			fetchOrGenerateTicket(currentUser.uid).then((qrCodeUrl) => {
				setQRCode(qrCodeUrl);
				window.localStorage.setItem("qrCodeUrl", qrCodeUrl);
			});
		}
	}, [currentUser]);

	useEffect(() => {
		window.localStorage.setItem(paths.myTicket, "visited");
	}, []);

	const fetchOrGenerateTicket = async (userId: string): Promise<string> => {
		const fetchTicket = httpsCallable<
			{ userId: string },
			{ qrCodeUrl?: string }
		>(functions, "fetchOrGenerateTicket");
		try {
			const result = await fetchTicket({
				userId: userId,
			});
			return result.data.qrCodeUrl ?? LoadingDots;
		} catch (error) {
			console.error("Error fetching or generating ticket:", error);
			return LoadingDots;
		}
	};

	const handleDownload = () => {
		const link = document.createElement("a");
		link.href = qrCode;
		link.download = "qrcode.png";
		link.click();
	};

	if (!currentUser) return <Navigate to={paths.login} />;

	const handleCreatePassObject = async (service: "apple" | "google") => {
		setLoading(true);
		try {
			const createTicket = httpsCallable(
				functions,
				service === "apple" ? "createTicket" : "createPassObject",
			);
			const ticketResult = await createTicket({
				email: email,
				pronouns: Array.isArray(userApp?.pronouns)
					? userApp.pronouns.join(", ")
					: (userApp?.pronouns ?? "Not specified"),
			});
			const ticketData = ticketResult.data as { url: string };
			if (ticketData.url) {
				window.location.href = ticketData.url;
			} else {
				alert(
					`Ticket has been issued but could not generate ${
						service === "apple" ? "Apple Wallet" : "Google Wallet"
					} pass.`,
				);
			}
		} catch (error) {
			console.error(
				`Failed to issue ticket for ${
					service === "apple" ? "Apple Wallet" : "Google Wallet"
				}:`,
				error,
			);
			logError(error as Error, `create_${service}_wallet_ticket_error`);
		}
		setLoading(false);
	};

	return (
		<PageWrapper>
			<Flex justify="start">
				<Box
					bg="#1F1E2E"
					rounded="xl"
					maxW="400px"
					w="full"
					p={8}
					display="flex"
					flexDirection="column"
					gap={2}
				>
					<Flex
						align="center"
						fontWeight="bold"
						fontSize={{ base: "2xl", md: "30px" }}
					>
						<Image src={OffwhiteLogo} alt="SpurHacks Logo" w="1/2" mr={2} />
					</Flex>

					<Flex direction="column" gap={2} my={2}>
						<Text fontSize={{ base: "3xl", md: "4xl" }} fontWeight="semibold">
							{firstName} {lastName}
						</Text>
						<Text color="white" truncate>
							{email}
						</Text>
					</Flex>

					<Box bg="white/40" h="1px" rounded="xl" />

					<Flex direction="column" align="center" gap={5}>
						<Image src={qrCode} alt="QR Code" w="full" />

						<Flex w="full" justify="space-evenly" align="center">
							<Button
								p={0}
								bg="transparent"
								_hover={{ bg: "transparent" }}
								onClick={() => handleCreatePassObject("apple")}
								w="40%"
							>
								<Image
									src={AppleWalletBadge}
									alt="Add to Apple Wallet"
									w="100%"
									h="auto"
								/>
							</Button>
							<Button
								p={0}
								bg="transparent"
								_hover={{ bg: "transparent" }}
								onClick={() => handleCreatePassObject("google")}
								w="45%"
							>
								<Image src={GoogleWalletBadge} alt="Add to Google Wallet" />
							</Button>
						</Flex>

						<Box
							w="full"
							display="flex"
							flexDirection="row"
							justifyItems="center"
							alignItems="center"
						>
							<Box bg="white/20" h="1px" w="full" rounded="xl" />
							<Text color="white/20" px={10}>
								OR
							</Text>
							<Box bg="white/20" h="1px" w="full" rounded="xl" />
						</Box>

						<Link bg="none" color="white" onClick={handleDownload}>
							Download to your device
						</Link>
					</Flex>

					{loading && (
						<Flex
							position="absolute"
							top={0}
							left={0}
							w="full"
							h="full"
							bg="blackAlpha.300"
							justify="center"
							align="center"
							rounded="xl"
						>
							<Image src={LoadingDots} alt="Loading..." />
						</Flex>
					)}
				</Box>
			</Flex>
		</PageWrapper>
	);
};
