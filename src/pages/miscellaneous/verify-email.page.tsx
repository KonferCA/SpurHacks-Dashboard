import { PageWrapper } from "@/components";
import { useAuth } from "@/providers";
import { paths } from "@/providers/RoutesProvider/data";
import { auth } from "@/services/firebase";
import { Box, Flex, Heading, Icon, Link, Stack, Text } from "@chakra-ui/react";
import { Button } from "@/components/ui/button";
import { sendEmailVerification } from "firebase/auth";
import { useRef, useState } from "react";
import { FiCheckCircle } from "react-icons/fi";
import { Navigate } from "react-router-dom";

export const VerifyEmailPage = () => {
	// 60 seconds timeout before the user can send the next email verification
	const [resendSeconds, setResendSeconds] = useState(0);
	// -9999 random number to init the ref, this will hold the id for the time interval
	const resendEmailCountdownRef = useRef<number>(-9999);
	const { logout, reloadUser, currentUser } = useAuth();

	const startCountdown = () => {
		resendEmailCountdownRef.current = window.setInterval(() => {
			setResendSeconds((seconds) => {
				if (seconds > 0) {
					return seconds - 1;
				}
				window.clearInterval(resendEmailCountdownRef.current);
				return 0;
			});
		}, 1000);
	};

	if (currentUser?.emailVerified) return <Navigate to={paths.home} />;

	return (
		<PageWrapper>
			<Box px={{ base: 4, sm: 6, lg: 8 }} py={8}>
				<Stack gap={8} maxW="xl" mx="auto">
					<Stack gap={4}>
						<Heading as="h1" size="lg" fontWeight="bold">
							One more step!
						</Heading>
						<Text color="gray.400">
							We've sent a verification link to your email address. Please check
							your inbox (and spam folder!) and click the link.
						</Text>
						<Text color="gray.400">
							Once you have verified your email, click the{" "}
							<Text as="span" color="orange.400" fontWeight="semibold">
								Check Verification Status
							</Text>{" "}
							button below.
						</Text>
					</Stack>

					<Box>
						<Text fontSize="sm" fontWeight="medium" mb={1} color="gray.700">
							Account Email
						</Text>
						{currentUser?.emailVerified ? (
							<Flex align="center" color="green.500" fontSize="sm">
								<Text mr={2}>Your email has been verified.</Text>
								<Icon as={FiCheckCircle} />
							</Flex>
						) : null}
						<Box
							mt={currentUser?.emailVerified ? 2 : 0}
							bg="whiteAlpha.200"
							color="white"
							px={4}
							py={3}
							borderRadius="full"
							fontSize="md"
						>
							{currentUser?.email ?? "N/A"}
						</Box>
					</Box>

					<Stack
						direction={{ base: "column", sm: "row" }}
						gap={4}
						justify="center"
					>
						<Button
							onClick={() => {
								if (resendSeconds <= 0 && auth.currentUser) {
									sendEmailVerification(auth.currentUser);
									setResendSeconds(60);
									startCountdown();
								}
							}}
							disabled={resendSeconds > 0}
							variant="outline"
							colorScheme="gray"
							borderColor="whiteAlpha.400"
							color="white"
							_hover={{ bg: "whiteAlpha.100" }}
							_active={{ bg: "whiteAlpha.200" }}
							size="lg"
							fontSize="md"
							borderRadius="full"
						>
							{resendSeconds <= 0
								? "Resend Verification Email"
								: `Resend available in ${resendSeconds}s`}
						</Button>
						<Button
							onClick={reloadUser}
							bg="orange.400"
							color="gray.900"
							_hover={{ bg: "orange.500" }}
							_active={{ bg: "orange.600" }}
							size="lg"
							fontSize="md"
							fontWeight="bold"
							borderRadius="full"
						>
							Check Verification Status
						</Button>
					</Stack>

					<Flex justify="center" mt={8}>
						<Link onClick={logout} color="gray.400" _hover={{ color: "white" }}>
							Log Out
						</Link>
					</Flex>
				</Stack>
			</Box>
		</PageWrapper>
	);
};
