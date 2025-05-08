import { LoadingAnimation } from "@/components";
import { toaster } from "@/components/ui/toaster";
import { auth } from "@/services/firebase";
import { verifyGitHubEmail } from "@/services/firebase/user";
import {
	type User,
	createUserWithEmailAndPassword,
	getRedirectResult,
	sendEmailVerification,
	sendPasswordResetEmail,
	signInWithEmailAndPassword,
	signInWithPopup,
	signInWithRedirect,
	signOut,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

// Local imports
import { AuthContext } from "./context";
import type { ProviderName, UserWithClaims } from "./types";
import {
	getNotificationByAuthErrCode,
	getProvider,
	isMobile,
	validateUser,
} from "./utils";

export const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
	const [currentUser, setCurrentUser] = useState<UserWithClaims | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isAuthReady, setIsAuthReady] = useState(false);

	const completeLoginProcess = async (user: User) => {
		setIsLoading(true);

		try {
			// check if user has a profile in firestore
			const userWithRole = await validateUser(user);

			// update user first with flushSync to ensure it completes
			flushSync(() => {
				setCurrentUser(userWithRole);
			});

			// small delay to ensure the user state update completes before setting loading to false - thx juan
			setTimeout(() => {
				setIsLoading(false);
				setIsAuthReady(true);
			}, 100);
		} catch (error) {
			console.error("Error in login process:", error);
			setIsLoading(false);
			setIsAuthReady(true);
		}
	};

	const login = async (email: string, password: string) => {
		try {
			const { user } = await signInWithEmailAndPassword(auth, email, password);
			await completeLoginProcess(user);
		} catch (error: any) {
			toaster.error(getNotificationByAuthErrCode(error.code));
		}
	};

	const logout = async () => {
		try {
			await signOut(auth);
		} catch (error) {
			toaster.error({
				title: "Oh no! Can't log out!",
				description:
					"Please try again after refreshing the page. If problem continues just don't leave, please T.T",
			});
		}
	};

	const createAccount = async (email: string, password: string) => {
		try {
			const { user } = await createUserWithEmailAndPassword(
				auth,
				email,
				password,
			);
			await sendEmailVerification(user);
			await completeLoginProcess(user);
		} catch (error: any) {
			toaster.error(getNotificationByAuthErrCode(error.code));
		}
	};

	const resetPassword = async (email: string) => {
		try {
			await sendPasswordResetEmail(auth, email);
			toaster.success({
				title: "Password reset email sent",
				description: "Please check your inbox for reset instructions.",
			});
		} catch (error: unknown) {
			toaster.error({
				title: "Oops! Something went wrong",
				description: "Password could not be reset.",
			});
			console.error(error);
		}
	};

	const loginWithProvider = async (name: ProviderName) => {
		try {
			const provider = getProvider(name);
			if (!provider) throw new Error("Invalid provider name");

			if (isMobile()) {
				// Use redirect sign-in for mobile devices
				await signInWithRedirect(auth, provider);
			} else {
				// Use popup sign-in for PCs
				// @ts-ignore _tokenResponse is being used as a work around for bug github signin but email shows unverified.
				const { user, providerId, _tokenResponse } = await signInWithPopup(
					auth,
					provider,
				);

				if (providerId && /github/i.test(providerId) && !user.emailVerified) {
					setIsLoading(true);
					const { oauthAccessToken } = _tokenResponse as {
						oauthAccessToken: string;
					};
					const verified = await verifyGitHubEmail(
						oauthAccessToken,
						user.email as string,
					);

					if (verified) {
						// interval set to wait email metadata gets properly updated in our user metadata after manual verification
						// takes about 1s
						let interval = 0;
						interval = window.setInterval(async () => {
							if (!auth.currentUser) {
								window.clearInterval(interval);
								setIsLoading(false);
							}
							if (!auth.currentUser?.emailVerified) {
								await reloadUser();
							} else {
								window.clearInterval(interval);
								setIsLoading(false);
							}
						}, 1000);
					} else {
						toaster.error({
							title: "Error Verifying Email",
							description:
								"Please log out and log in again. If problem persists, please contact us in our Discord support channel.",
						});
					}
				}
			}
		} catch (error: any) {
			console.error(error);
			if (
				error.code === "auth/popup-closed-by-user" ||
				error.code === "auth/cancelled-popup-request"
			) {
				// user closed the popup or cancelled the request, do nothing (don't show an error)
				return;
			}
			if (error.code === "auth/account-exists-with-different-credential") {
				toaster.error({
					title: "Oops! Something went wrong.",
					description:
						"An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address.",
				});
			} else {
				toaster.error({
					title: "Oops! Something went wrong.",
					description: "Please try again later.",
				});
				console.error(error);
			}
		}
	};

	const reloadUser = async () => {
		if (auth.currentUser) {
			await auth.currentUser.reload();
			const userWithRole = await validateUser(auth.currentUser);
			setCurrentUser(userWithRole);
		}
	};

	useEffect(() => {
		setIsLoading(true);
		let authStateResolved = false;

		// Setup timeout to ensure we don't wait indefinitely
		const backupTimer = setTimeout(() => {
			if (!authStateResolved) {
				console.log(
					"Auth state taking too long, forcing ready state after 2s timeout",
				);
				setIsLoading(false);
				setIsAuthReady(true);
			}
		}, 2000);

		const unsub = auth.onAuthStateChanged(async (user) => {
			authStateResolved = true;

			if (user) {
				await completeLoginProcess(user);
			} else {
				// if no user, make sure to update state in the correct order
				setCurrentUser(null);

				// Ensure we always wait a minimum time for better UX
				setTimeout(() => {
					setIsLoading(false);
					setIsAuthReady(true);
				}, 100);
			}
		});

		// Handle redirect result for mobile
		const handleRedirectResult = async () => {
			try {
				const result = await getRedirectResult(auth);

				if (result) {
					await completeLoginProcess(result.user);
				} else if (!authStateResolved) {
					// Only set states if auth state hasn't been resolved yet
					setTimeout(() => {
						setIsLoading(false);
						setIsAuthReady(true);
					}, 100);
				}
			} catch (error) {
				console.error("Redirect error:", error);
				if (!authStateResolved) {
					setIsLoading(false);
					setIsAuthReady(true);
				}
			}
		};

		if (isMobile()) {
			handleRedirectResult();
		}

		return () => {
			unsub();
			clearTimeout(backupTimer);
		};
	}, []);

	if (!isAuthReady) {
		return <LoadingAnimation />;
	}

	return (
		<AuthContext.Provider
			value={{
				currentUser,
				isLoading,
				login,
				logout,
				createAccount,
				resetPassword,
				loginWithProvider,
				reloadUser,
			}}
		>
			{isLoading ? <LoadingAnimation /> : children}
		</AuthContext.Provider>
	);
};
