import { AppleWalletBadge, GoogleWalletBadge } from "@/assets";
import { PageWrapper } from "@/components";
import { useApplications } from "@/hooks/use-applications";
import { useAuth } from "@/providers";
import { paths } from "@/providers/RoutesProvider/data";
import { logError } from "@/services/firebase/log";
import { createTicketDoc, existsTicketDoc } from "@/services/firebase/ticket";
import { OffwhiteLogo } from "@assets";
import {
	AbsoluteCenter,
	Box,
	Button,
	Flex,
	Image,
	QrCode,
	Spinner,
	Text,
	VisuallyHidden,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";

export const MyTicketPage = () => {
	const [isLoading, setIsLoading] = useState(false);
	const functions = getFunctions();
	const { currentUser } = useAuth();
	const { current: userApp } = useApplications();
	const { data: qrCodeValue, isLoading: isLoadingQRCode } = useQuery({
		queryKey: ["my-ticket", currentUser],
		queryFn: async () => {
			if (!currentUser) return "";
			let ticketID: string = `ticket_${currentUser.uid}`;
			let exists = false;
			try {
				exists = await existsTicketDoc(ticketID);
			} catch (error) {
				console.error("Failed to check ticket existence", error);
			}

			if (!exists) {
				try {
					ticketID = await createTicketDoc();
				} catch (error) {
					console.error("Failed to create ticket", error);
					// set ticketID to undefined to indicate that the generation has gone wrong.
					ticketID = "";
				}
			}

			// final qr code value has to be the url if ticketID is defined (no errors) otherwise it should return undefined
			return ticketID
				? `${import.meta.env.VITE_BASE_URL}/ticket/${ticketID}`
				: "";
		},
		enabled: !!currentUser,
		refetchOnMount: false,
		refetchOnReconnect: false,
		refetchOnWindowFocus: false,
	});
	const qrCodeDownloadTriggerRef = useRef<HTMLButtonElement | null>(null);

	const fullName = useMemo(() => {
		let firstName = "";
		let lastName = "";

		if (userApp) {
			firstName = userApp.firstName;
			lastName = userApp.lastName;
		} else if (currentUser) {
			const parts = currentUser.displayName?.split(" ") || ["", ""];
			firstName = parts[0];
			lastName = parts[1];
		}

		return firstName && lastName
			? `${firstName} ${lastName}`
			: "Unknown Hacker";
	}, [userApp, currentUser]);

	useEffect(() => {
		window.localStorage.setItem(paths.myTicket, "visited");
	}, []);

	if (!currentUser) return <Navigate to={paths.login} />;

	const handleCreatePassObject = async (service: "apple" | "google") => {
		setIsLoading(true);
		try {
			const createTicket = httpsCallable(
				functions,
				service === "apple" ? "createTicket" : "addToGoogleWallet",
			);
			const ticketResult = await createTicket({
				email: currentUser?.email ?? "",
				pronouns: Array.isArray(userApp?.pronouns)
					? userApp.pronouns.join(", ")
					: (userApp?.pronouns ?? "Not specified"),
			});
			const ticketData = ticketResult.data as { url: string };
			if (ticketData.url) {
				window.open(ticketData.url, "_blank");
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
		setIsLoading(false);
	};

	return (
		<PageWrapper>
			<Box
				position="relative"
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
						{fullName}
					</Text>
					<Text color="white" truncate>
						{currentUser?.email ?? ""}
					</Text>
				</Flex>

				<Box bg="white/40" h="1px" rounded="xl" />

				<Flex direction="column" align="center" gap={5}>
					<QrCode.Root value={qrCodeValue} size="xl">
						<QrCode.Frame>
							<QrCode.Pattern />
						</QrCode.Frame>

						<VisuallyHidden>
							<QrCode.DownloadTrigger
								ref={qrCodeDownloadTriggerRef}
								fileName="spurhacks-ticket-qrcode.jpeg"
								mimeType="image/jpeg"
							>
								Download to your device
							</QrCode.DownloadTrigger>
						</VisuallyHidden>

						{isLoadingQRCode && !qrCodeValue && (
							<AbsoluteCenter bg="bg/80" boxSize="100%">
								<Spinner color="brand.primary" />
							</AbsoluteCenter>
						)}
					</QrCode.Root>

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
					<Button
						bg="transparent"
						color="fg"
						p="0"
						fontSize="lg"
						fontWeight="medium"
						_hover={{ textDecoration: "underline" }}
						onClick={() => {
							if (qrCodeDownloadTriggerRef.current) {
								qrCodeDownloadTriggerRef.current.click();
							}
						}}
					>
						Download to your device
					</Button>
				</Flex>
				{isLoading && (
					<AbsoluteCenter bg="bg/80" boxSize="100%">
						<Spinner color="brand.primary" />
					</AbsoluteCenter>
				)}
			</Box>
		</PageWrapper>
	);
};
