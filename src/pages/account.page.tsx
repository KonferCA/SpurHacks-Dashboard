import { PageWrapper, TextInput } from "@/components";
import { toaster } from "@/components/ui/toaster";
import { Field } from "@/components/ui/field";
import { PhoneInput } from "@/components/PhoneInput/PhoneInput";
import { useApplications } from "@/hooks/use-applications";
import { useAuth } from "@/providers";
import { useQuery } from "@tanstack/react-query";
import {
	getEmergencyContact,
	type EmergencyContact,
} from "@/services/firebase/emergency-contact";
import { saveEmergencyContact } from "@/services/firebase/emergency-contact";
import { useMutation } from "@tanstack/react-query";
import { defaultApplication } from "@/forms/hacker-form/defaults";
import { Button, Flex, Text } from "@chakra-ui/react";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { deleteUser, updatePhoneNumber } from "firebase/auth";
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
	const { applications, refreshApplications } = useApplications();
	const userApp = applications[0] || null;
	const [errors, setErrors] = useState<FormErrors>({ _hasErrors: false });
	const [isSendingReset, setIsSendingReset] = useState(false);
	const [resetStatus, setResetStatus] = useState<"idle" | "success" | "error">(
		"idle",
	);
	const [phone, setPhone] = useState(
		userApp?.phone ?? {
			country: "Canada (+1)",
			number: "",
		},
	);

	// Emergency Contact functionality
	const { data: emergencyContact, isLoading: isLoadingEmergencyContact } =
		useQuery<EmergencyContact | null>({
			queryKey: ["emergency-contact", currentUser?.uid],
			enabled: !!currentUser?.uid,
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			queryFn: () => getEmergencyContact(currentUser!.uid),
		});

	const [isEditingEmergency, setIsEditingEmergency] = useState(false);
	const [emergencyForm, setEmergencyForm] = useState<EmergencyContact>({
		name: "",
		phone: "",
		relation: "",
	});

	useEffect(() => {
		if (emergencyContact) {
			setEmergencyForm(emergencyContact);
		}
	}, [emergencyContact]);

	const emergencyMutation = useMutation({
		mutationFn: (data: EmergencyContact) =>
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			saveEmergencyContact(currentUser!.uid, data),
		onSuccess: () => {
			toaster.success({
				title: "Saved emergency contact",
				description: "Your emergency contact has been updated.",
			});
			setIsEditingEmergency(false);
		},
		onError: () => {
			toaster.error({
				title: "Error",
				description: "Could not save emergency contact. Try again later.",
			});
		},
	});

	const handleRequestPhoneChange = async () => {
		// call cloud function from here...
		await updatePhoneNumber({
			phone: phone.number,
			country: phone.country,
		});
		toaster.info({
			title: "Phone Change Request",
			description:
				"To change your phone number, please contact support or use the official process.",
		});
	};

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
					{/* User email */}
					<Flex direction="column">
						<TextInput
							label="Email"
							type="email"
							defaultValue={currentUser?.email ?? ""}
							description=""
							disabled
						/>
					</Flex>
					{/* User phone input */}
					<Flex direction="column" gap={2}>
						<PhoneInput
							required
							value={phone}
							onChange={setPhone}
							error={errors.phone}
							disabled={!userApp}
						/>
						{userApp ? (
							<Button
								size="md"
								borderRadius="full"
								w="fit-content"
								alignSelf="start"
								onClick={handleRequestPhoneChange}
							>
								UPDATE PHONE NUMBER
							</Button>
						) : (
							<Text color="offwhite.primary/30">
								Updating the phone input is disabled until an application has
								been submitted.
							</Text>
						)}
					</Flex>
					{/* Emergency Contact */}
					<Flex direction="column" gap={4}>
						<Text color="offwhite.primary/30">EMERGENCY CONTACT</Text>

						{isLoadingEmergencyContact ? (
							<Text>Loading...</Text>
						) : (
							<>
								<TextInput
									label="Full Name"
									value={emergencyForm.name}
									onChange={(e) =>
										setEmergencyForm((prev) => ({
											...prev,
											name: e.target.value,
										}))
									}
									disabled={!isEditingEmergency}
								/>
								<TextInput
									label="Phone Number"
									value={emergencyForm.phone}
									onChange={(e) =>
										setEmergencyForm((prev) => ({
											...prev,
											phone: e.target.value,
										}))
									}
									disabled={!isEditingEmergency}
								/>
								<TextInput
									label="Relationship"
									value={emergencyForm.relation}
									onChange={(e) =>
										setEmergencyForm((prev) => ({
											...prev,
											relation: e.target.value,
										}))
									}
									disabled={!isEditingEmergency}
								/>

								{isEditingEmergency ? (
									<Flex gap={2}>
										<Button
											onClick={() => emergencyMutation.mutate(emergencyForm)}
											loading={emergencyMutation.isPending}
											rounded="full"
										>
											Save
										</Button>
										<Button
											onClick={() => {
												setIsEditingEmergency(false);
												setEmergencyForm(
													emergencyContact ?? {
														name: "",
														phone: "",
														relation: "",
													},
												);
											}}
											variant="outline"
											rounded="full"
										>
											Cancel
										</Button>
									</Flex>
								) : (
									<Button
										onClick={() => setIsEditingEmergency(true)}
										variant="outline"
										rounded="full"
										alignSelf="start"
									>
										Edit
									</Button>
								)}
							</>
						)}
					</Flex>
					{/* User password */}
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
