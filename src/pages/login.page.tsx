import { useAuth, useRouteDefinitions } from "@/providers";
import type { ProviderName } from "@/providers";
import { paths } from "@/providers/RoutesProvider/data";
import { GithubLogo, GoogleLogo } from "@assets";
import SpurhacksLogo from "@/assets/spurhacks-full-logo-white.svg";
import knotsSvg from "@/assets/knots.svg";
import {
	Box,
	Button,
	Flex,
	Grid,
	GridItem,
	Heading,
	Icon,
	Image,
	Input,
	InputGroup,
	Link,
	Stack,
	Text,
} from "@chakra-ui/react";
import { type FormEventHandler, useState } from "react";
import { flushSync } from "react-dom";
import { FcGoogle } from "react-icons/fc";
import { Navigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Field } from "@/components/ui/field";

// email validation with zod, double guard just in case someone changes the input type in html
const emailParser = z.string().email();

// Restore the full list of auth providers
const authProviders: { name: ProviderName; logo: string }[] = [
	{ name: "github", logo: GithubLogo },
	{ name: "google", logo: GoogleLogo },
];

export const LoginPage = () => {
	// input elements value fields
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPass, setConfirmPass] = useState("");

	// controls to set invalid styles for input fields
	const [isInvalidEmail, setIsInvalidEmail] = useState(false);
	const [isInvalidPassword, setIsInvalidPassword] = useState(false);

	// control for password reset form
	const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
	// state for password visibility toggle
	const [showPassword] = useState(false);
	const [showConfirmPassword] = useState(false);

	// custom password err msg, can also be done for email but it shouldn't really need any msgs.
	const [passwordErrMsg, setPasswordErrMsg] = useState("");

	// control auth flow and form state to show correct title, toggle button
	const [isLogin, setIsLogin] = useState(true);

	const {
		login,
		createAccount,
		resetPassword,
		loginWithProvider,
		currentUser,
	} = useAuth();

	const routes = useRouteDefinitions();

	const [searchParams] = useSearchParams();

	const handlerSubmit: FormEventHandler = async (e) => {
		// prevent page refresh when form is submitted
		e.preventDefault();

		const emailResult = emailParser.safeParse(email);

		// email input validation
		if (!emailResult.success) {
			setIsInvalidEmail(true);
			return;
		}
		// reset error state if validation passes
		setIsInvalidEmail(false);

		// only check for matching password when creating a new account
		if (!isLogin) {
			// perform password input validation
			if (password !== confirmPass) {
				setIsInvalidPassword(true);
				setPasswordErrMsg("The passwords do not match!");
				return;
			}

			// double safe guard if someone disables the min length attribute in html
			const minPassLength = 8;
			if (
				password.length < minPassLength ||
				confirmPass.length < minPassLength
			) {
				setIsInvalidPassword(true);
				setPasswordErrMsg("Password must be longer than 8 characters!");
				return;
			}
			// reset error state if validation passes
			setIsInvalidPassword(false);
			setPasswordErrMsg("");
		} else {
			// reset password error state if switching back to login
			setIsInvalidPassword(false);
			setPasswordErrMsg("");
		}

		if (isLogin) {
			if (showResetPasswordForm) {
				try {
					await resetPassword(email);
					setShowResetPasswordForm(false);
				} catch (error) {
					console.error("Password reset failed:", error);
					setIsInvalidEmail(true); // indicate error on email field maybe?
				}
				return;
			}
			try {
				await login(email, password);
				// navigation handled by the redirect logic below
			} catch (error) {
				console.error("Login failed:", error);
				setIsInvalidPassword(true); // mark password as invalid on login failure
				setPasswordErrMsg("Invalid email or password."); // provide generic error
			}
		} else {
			try {
				await createAccount(email, password);
				flushSync(() => {
					setIsLogin(true);
					setPassword("");
					setConfirmPass("");
				});
			} catch (error) {
				console.error("Account creation failed:", error);
				// check error type, maybe email already exists?
				setIsInvalidEmail(true); // or set specific error message
			}
		}
	};

	const toggleForm = () => {
		setConfirmPass("");
		setPassword("");
		setEmail(""); // clear email too when switching form
		setIsLogin(!isLogin);
		// reset all error states
		setIsInvalidEmail(false);
		setIsInvalidPassword(false);
		setPasswordErrMsg("");
		setShowResetPasswordForm(false); // ensure reset form is hidden when toggling
	};

	const toggleResetPassword = () => {
		setShowResetPasswordForm(!showResetPasswordForm);
		// don't necessarily set isLogin here, depends on desired flow
		// reset fields and errors when toggling reset form
		setEmail(""); // also clear email when toggling reset
		setPassword("");
		setConfirmPass("");
		setIsInvalidEmail(false);
		setIsInvalidPassword(false);
		setPasswordErrMsg("");
	};

	// leverage access to current user to decide whether we need to proceed rendering page
	if (currentUser !== null) {
		if (currentUser.hawkAdmin) {
			return <Navigate to={paths.admin} />;
		}
		const from = searchParams.get("from");
		const available = routes.some((r) => {
			// join team is globally available
			if (r.path?.startsWith("/join-team")) return true;
			return r.path === from;
		});

		if (from?.startsWith("/verify-email") && currentUser.emailVerified) {
			return <Navigate to="/" />;
		}

		return (
			<Navigate to={from && from !== "/" && available ? from : paths.home} />
		);
	}

	return (
		<Grid
			templateColumns={{ base: "1fr", md: "1fr 1fr" }}
			minH="100vh"
			style={{
				background: `radial-gradient(
                    circle at top left,
                    #000000 0%,
                    #191C26 30%,
                    #26252F 52%,
                    #332D38 65%,
                    #4D3E4A 78%,
                    #6B5C6D 90%,
                    #897B90 99%,
                    #C5B8D6 120%
                )`,
			}}
			color="white"
		>
			<GridItem
				w="full"
				display="flex"
				alignItems="center"
				justifyContent="center"
				py={{ base: 12, md: 16 }}
				px={{ base: 4, sm: 6, md: 8 }}
			>
				<Box maxW="md" w="full">
					<Image
						src={SpurhacksLogo}
						alt="SpurHacks Logo"
						h={10}
						mb={8}
						maxW="100%"
						w="auto"
						style={{ minWidth: 0 }}
					/>

					{/* heading */}
					<Heading as="h1" size="xl" fontWeight="bold" mb={2}>
						{showResetPasswordForm
							? "Reset Password"
							: isLogin
								? "Log into your account"
								: "Create your account"}
					</Heading>

					{!showResetPasswordForm && (
						<Text color="gray.400" mb={8}>
							Join thousands of hackers across Canada in a 36 hour period of
							exploration, creativity, and learning!
						</Text>
					)}

					<form onSubmit={handlerSubmit}>
						<Stack gap={5}>
							<Field
								label="Email"
								invalid={isInvalidEmail}
								required
								errorText={
									isInvalidEmail ? "Invalid email address." : undefined
								}
							>
								<Input
									id="email"
									type="email"
									placeholder="example@email.com"
									value={email}
									onChange={({ target: { value } }) => setEmail(value)}
									bg="whiteAlpha.200"
									borderColor="transparent"
									borderRadius="full"
									_placeholder={{ color: "gray.500" }}
									size="lg"
								/>
							</Field>

							{!showResetPasswordForm && (
								<Field
									label="Password"
									invalid={isInvalidPassword}
									required
									errorText={isInvalidPassword ? passwordErrMsg : undefined}
								>
									<InputGroup>
										<Input
											id="password"
											type={showPassword ? "text" : "password"}
											placeholder="iloveinstantnoodles123"
											minLength={isLogin ? undefined : 8}
											value={password}
											onChange={({ target: { value } }) => setPassword(value)}
											bg="whiteAlpha.200"
											borderColor="transparent"
											borderRadius="full"
											_placeholder={{ color: "gray.500" }}
											size="lg"
										/>
									</InputGroup>
								</Field>
							)}

							{!isLogin && !showResetPasswordForm && (
								<Field
									label="Confirm Password"
									invalid={isInvalidPassword}
									required
									errorText={isInvalidPassword ? passwordErrMsg : undefined}
								>
									<InputGroup>
										<Input
											id="confirmPassword"
											type={showConfirmPassword ? "text" : "password"}
											placeholder="re-enter your password"
											minLength={8}
											value={confirmPass}
											onChange={({ target: { value } }) =>
												setConfirmPass(value)
											}
											bg="whiteAlpha.200"
											borderColor="transparent"
											borderRadius="full"
											_placeholder={{ color: "gray.500" }}
											size="lg"
										/>
									</InputGroup>
								</Field>
							)}

							{isLogin && !showResetPasswordForm && (
								<Flex justify="flex-end">
									<Link
										onClick={toggleResetPassword}
										fontSize="sm"
										color="gray.400"
										_hover={{ color: "white", textDecoration: "underline" }}
									>
										Forgot Password?
									</Link>
								</Flex>
							)}

							<Button
								type="submit"
								bg="orange.400"
								color="gray.900"
								_hover={{ bg: "orange.500" }}
								_active={{ bg: "orange.600" }}
								size="lg"
								fontSize="md"
								fontWeight="bold"
								borderRadius="full"
								w="full"
							>
								{showResetPasswordForm
									? "Send Reset Link"
									: isLogin
										? "Log In"
										: "Sign Up"}
							</Button>
						</Stack>
					</form>

					{!showResetPasswordForm && (
						<Flex align="center" my={6}>
							<Box h="1px" bg="gray.600" flexGrow={1} />
							<Text px={4} flexShrink={0} color="gray.400" fontSize="sm">
								OR
							</Text>
							<Box h="1px" bg="gray.600" flexGrow={1} />
						</Flex>
					)}

					{!showResetPasswordForm && (
						<Stack gap={4}>
							{authProviders.map((provider) => (
								<Button
									key={provider.name}
									onClick={async () => {
										try {
											await loginWithProvider(provider.name);
										} catch (error) {
											console.error(`${provider.name} login failed:`, error);
										}
									}}
									variant="outline"
									colorScheme="gray"
									borderColor="whiteAlpha.400"
									color="white"
									_hover={{ bg: "whiteAlpha.100" }}
									_active={{ bg: "whiteAlpha.200" }}
									size="lg"
									fontSize="md"
									fontWeight="medium"
									borderRadius="full"
									w="full"
								>
									<Flex align="center" justify="center" gap={2}>
										{provider.name === "google" ? (
											<Icon as={FcGoogle} boxSize={5} />
										) : (
											<Image
												src={provider.logo}
												alt={`${provider.name} logo`}
												boxSize={5}
											/>
										)}
										<Text as="span">
											{`Log In with ${provider.name.charAt(0).toUpperCase() + provider.name.slice(1)}`}
										</Text>
									</Flex>
								</Button>
							))}
						</Stack>
					)}

					<Text mt={8} textAlign="center" fontSize="sm" color="gray.400">
						{showResetPasswordForm ? (
							<Link
								onClick={toggleResetPassword}
								fontWeight="medium"
								color="white"
								_hover={{ textDecoration: "underline" }}
							>
								Back to Log In
							</Link>
						) : isLogin ? (
							<>
								Don't have an account?{" "}
								<Link
									onClick={toggleForm}
									fontWeight="medium"
									color="white"
									_hover={{ textDecoration: "underline" }}
								>
									Sign up
								</Link>
							</>
						) : (
							<>
								Already have an account?{" "}
								<Link
									onClick={toggleForm}
									fontWeight="medium"
									color="white"
									_hover={{ textDecoration: "underline" }}
								>
									Log In
								</Link>
							</>
						)}
					</Text>
				</Box>
			</GridItem>

			<GridItem
				display={{ base: "none", md: "flex" }}
				alignItems="stretch"
				position="relative"
				overflow="hidden"
				h="full"
			>
				<Image
					src={knotsSvg}
					alt="Abstract decorative knots graphic"
					h="full"
					w="auto"
					maxW="none"
					maxH="100vh"
					objectFit="contain"
					ml="auto"
				/>
			</GridItem>
		</Grid>
	);
};
