import { PageWrapper, TextInput } from "@/components";
import { toaster } from "@/components/ui/toaster";
import { Field } from "@/components/ui/field";
import { PhoneInput } from "@/components/PhoneInput/PhoneInput";
import { useApplications } from "@/hooks/use-applications";
import { useAuth } from "@/providers";
import { defaultApplication } from "@/forms/hacker-form/defaults";
import { Button, Flex, Text } from "@chakra-ui/react";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { deleteUser } from "firebase/auth";
import { useNavigate } from "react-router-dom";
// import { verifyRSVP } from "@/services/firebase/rsvp";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
	ApplicationData,
	ApplicationDataKey,
} from "@/forms/hacker-form/types";
import { PasswordInput } from "@/components/ui/password-input";
import { useDebounce } from "@/hooks/use-debounce";
import {
	saveApplicationDraft,
	updateApplication,
} from "@/services/firebase/application";
import { auth } from "@/services/firebase";
import { withdrawRSVP } from "@/services/firebase/rsvp";

// if (isLoading) return <LoadingAnimation />;
type FormErrors = { _hasErrors: boolean } & Partial<
	Record<ApplicationDataKey, string>
>;

export const AccountPage = () => {
	const navigate = useNavigate();
	const { currentUser, resetPassword } = useAuth();
	const { applications, drafts, refreshApplications, refreshDrafts } =
		useApplications();
	const userApp = applications[0] || null;
	const [errors, setErrors] = useState<FormErrors>({ _hasErrors: false });
	const [isSendingReset, setIsSendingReset] = useState(false);
	const [resetStatus, setResetStatus] = useState<"idle" | "success" | "error">(
		"idle",
	);

	// Only create a draft if neither an application nor a draft exists
	useEffect(() => {
		const ensureDraftExists = async () => {
			if (!currentUser?.uid) return;
			if (applications.length === 0 && drafts.length === 0) {
				try {
					await saveApplicationDraft(
						{
							...defaultApplication,
							email: currentUser.email ?? "",
						},
						currentUser.uid,
						undefined,
					);
					await refreshDrafts();
				} catch (error) {
					console.error("Failed to create draft application:", error);
					toaster.error({
						title: "Draft creation error",
						description:
							"Could not create a draft application. Try again later.",
					});
				}
			}
		};
		ensureDraftExists();
	}, [currentUser?.uid, applications.length, drafts.length, refreshDrafts]);

	// Use application if it exists, otherwise use draft, otherwise default
	const [application, setApplication] = useState<ApplicationData>(() => {
		if (userApp) {
			return { ...defaultApplication, ...userApp };
		}
		if (drafts.length > 0) {
			const { __docId, ...draftData } = drafts[0];
			return { ...defaultApplication, ...draftData };
		}
		return {
			...defaultApplication,
			email: currentUser?.email ?? "",
		};
	});

	// Keep application state in sync with Firestore
	useEffect(() => {
		if (userApp) {
			setApplication({ ...defaultApplication, ...userApp });
		} else if (drafts.length > 0) {
			const { __docId, ...draftData } = drafts[0];
			setApplication({ ...defaultApplication, ...draftData });
		}
	}, [userApp, drafts]);

	const draftId = useMemo(() => {
		if (drafts.length) return drafts[0].__docId;
		return undefined;
	}, [drafts]);

	const autosave = useDebounce(
		//@ts-ignore
		async (application: ApplicationData, uid?: string, docId?: string) => {
			if (!uid) {
				console.warn("Skipping autosave: Missing UID", { uid });
				return;
			}
			try {
				if (appDocId) {
					// Save to application document
					await updateApplication(application, uid, appDocId);
					await refreshApplications();
				} else if (draftDocId) {
					// Save to draft document
					await saveApplicationDraft(application, uid, draftDocId);
					await refreshDrafts();
				} else {
					// No draft exists, create one
					await saveApplicationDraft(application, uid, undefined);
					await refreshDrafts();
				}
			} catch (error) {
				console.error("Autosave failed:", error);
				toaster.error({
					title: "Autosave error",
					description: "Could not save your progress. Try again later.",
				});
			}
		},
		500,
		[],
	);

	const appDocId = useMemo(() => {
		if (applications.length) return applications[0].__docId;
		return undefined;
	}, [applications]);

	const draftDocId = useMemo(() => {
		if (drafts.length) return drafts[0].__docId;
		return undefined;
	}, [drafts]);

	const handleChange = useCallback(
		<K extends ApplicationDataKey>(name: K, data: ApplicationData[K]) => {
			setApplication((application) => {
				const updatedApp = { ...application };
				updatedApp[name] = data;
				autosave(updatedApp, currentUser?.uid, appDocId, draftDocId);
				return updatedApp;
			});
			clearErrors();
		},
		[currentUser?.uid, appDocId, draftDocId, autosave],
	);

	const clearErrors = () => setErrors({ _hasErrors: false });

	const handlePasswordReset = async () => {
		if (!currentUser?.email) return;
		setIsSendingReset(true);
		setResetStatus("idle");
		try {
			await resetPassword(currentUser.email);
			setResetStatus("success");
		} catch (err) {
			console.error("Password reset failed:", err);
			setResetStatus("error");
		} finally {
			setIsSendingReset(false);
		}
	};

	// Revoke RSVP
	const [isRevokingRSVP, setIsRevokingRSVP] = useState(false);
	const handleRevokeRSVP = async () => {
		try {
			setIsRevokingRSVP(true);
			await withdrawRSVP();
			await refreshApplications(); // re-fetch updates, e.g., rsvpVerified now false

			toaster.success({
				title: "RSVP Revoked",
				description: "You've successfully withdrawn your RSVP.",
			});
		} catch (error) {
			console.error("Failed to revoke RSVP:", error);
			toaster.error({
				title: "Failed to revoke RSVP",
				description: "Please try again later or contact support.",
			});
		} finally {
			setIsRevokingRSVP(false);
		}
	};

	// Confirm Delete button
	const [showConfirmDelete, setShowConfirmDelete] = useState(false);
	const handleDeleteClick = () => {
		setShowConfirmDelete((prev) => !prev);
	};
	const handleDeleteAccountConfirmed = async () => {
		if (!currentUser) return;

		try {
			const user = auth.currentUser;
			if (!user) {
				console.error("No authenticated user found.");
				return;
			}

			await deleteUser(user);

			navigate("/", { replace: true });
		} catch (error) {
			console.error("Error deleting account:", error);
			toaster.error({
				title: "Account deletion failed",
				description: "Please try again later or re-authenticate.",
			});
		}
	};

	return (
		<PageWrapper>
			<Flex w="full" pl={5}>
				<Flex w="full" maxW="30rem" direction="column" gap="10">
					<Flex direction="column">
						<TextInput
							label="Email"
							type="email"
							defaultValue={currentUser?.email ?? ""}
							description=""
							disabled
						/>
					</Flex>
					<PhoneInput
						required
						value={application.phone}
						onChange={(v) => handleChange("phone", v)}
						error={errors.phone}
					/>
					<Flex direction="column" gap={2}>
						<Text color="offwhite.primary/30">CHANGE PASSWORD</Text>
						<Field label="Current Password">
							<PasswordInput
								id="currentPassword"
								placeholder="••••••••••••••"
								value=""
								onChange={() => {}}
								bg="#333147"
								borderColor="transparent"
								borderRadius="full"
								_placeholder={{ color: "#666381" }}
								_autofill={{
									boxShadow: "0 0 0px 1000px #333147 inset",
									WebkitTextFillColor: "var(--chakra-colors-offwhite-primary)",
								}}
								size="lg"
								disabled
							/>
						</Field>
						<Button
							onClick={handlePasswordReset}
							size="md"
							borderRadius="full"
							w="fit-content"
							alignSelf="start"
							loading={isSendingReset}
						>
							CHANGE PASSWORD
						</Button>
						{resetStatus === "success" && (
							<Text fontSize="sm" color="green.400">
								Reset email sent successfully.
							</Text>
						)}
						{resetStatus === "error" && (
							<Text fontSize="sm" color="red.400">
								Failed to send reset link.
							</Text>
						)}
					</Flex>
					{/* NEEDS TO BE FIXED */}
					{userApp?.rsvp ? (
						<Flex direction="column" gap={4}>
							<Flex alignItems="start" direction="column" gap={4}>
								<Text color="offwhite.primary/30">CHANGE RSVP STATUS</Text>
								<Flex gap={4}>
									<Text color="offwhite.primary/30">
										You are currently RSVP’d.
									</Text>
									<CheckCircleIcon width="20" color="green" />
								</Flex>
								<Text color="offwhite.primary/30">
									We understand that life hands you unexpected events. You may
									revoke your RSVP status, and allow someone else a chance to
									experience SpurHacks 2025 instead. This action cannot be
									undone!
								</Text>
								<Button
									bg="transparent"
									borderWidth={1}
									borderColor="brand.error"
									color="brand.error"
									rounded="full"
									onClick={handleRevokeRSVP}
									loading={isRevokingRSVP}
								>
									REVOKE RSVP STATUS
								</Button>
							</Flex>
						</Flex>
					) : (
						<></>
						// <Flex alignItems="start" direction="column" gap={4}>
						// 	<Flex gap={4}>
						// 		<Text color="offwhite.primary/30">
						// 			You have not RSVP'd yet.
						// 		</Text>
						// 	</Flex>
						// 	<Button rounded="full" px={8} onClick={handleRSVP}>
						// 		RSVP
						// 	</Button>
						// </Flex>
					)}
					<Flex alignItems="start" direction="column" gap={4}>
						<Text color="offwhite.primary/30">DANGER ZONE</Text>
						<Text color="offwhite.primary/30">
							Deleting your account means revoking your acceptance to SpurHacks
							2025. This action cannot be undone!
						</Text>
						<Button
							bg="brand.error"
							color="offwhite.primary"
							rounded="full"
							onClick={handleDeleteClick}
						>
							DELETE ACCOUNT
						</Button>

						{showConfirmDelete && (
							<Button
								bg="#1f1e2e"
								color="brand.error"
								rounded="full"
								onClick={handleDeleteAccountConfirmed}
								mt={-2}
							>
								<Text color="offwhite.primary/30" pr={2}>
									Are you sure?
								</Text>{" "}
								Yes, delete my account.
							</Button>
						)}
					</Flex>
				</Flex>
			</Flex>
		</PageWrapper>
	);
};
