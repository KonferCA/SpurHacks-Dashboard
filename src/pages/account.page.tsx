import { Modal, PageWrapper, Select, TextInput } from "@/components";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { toaster } from "@/components/ui/toaster";
import { Field } from "@/components/ui/field";
import { PhoneInput } from "@/components/PhoneInput/PhoneInput";
import { useApplications } from "@/hooks/use-applications";
import { useAuth, useUser } from "@/providers";
import { defaultApplication } from "@/forms/hacker-form/defaults";
import { getResumeURL, uploadGeneralResume } from "@/services/firebase/files";
import type { ResumeVisibility, Socials } from "@/services/firebase/types";
import { getSocials, updateSocials } from "@/services/firebase/user";
import { useUserStore } from "@/stores/user.store";
import { Button, Flex, Icon, Text } from "@chakra-ui/react";
import { Cog6ToothIconm, CheckCircleIcon } from "@heroicons/react/24/outline";
import {
	type FormEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	MdOpenInNew,
	MdOutlineEdit,
	MdOutlineRemoveCircleOutline,
	MdWarning,
} from "react-icons/md";
import type {
	ApplicationData,
	ApplicationDataKey,
} from "@/forms/hacker-form/types";
import { PasswordInput } from "@/components/ui/password-input";
import { Eye, EyeClosed } from "@phosphor-icons/react";
import { useDebounce } from "@/hooks/use-debounce";
import {
	DuplicateApplicationError,
	saveApplicationDraft,
	submitApplication,
} from "@/services/firebase/application";

const allowedFileTypes = [
	"image/*", //png, jpg, jpeg, jfif, pjpeg, pjp, gif, webp, bmp, svg
	"application/pdf", //pdf
	"application/msword", //doc, dot, wiz
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document", //docx
	"application/rtf", //rtf
	"application/oda", //oda
	"text/markdown", //md, markdown, mdown, markdn
	"text/plain", //txt, text, conf, def, list, log, in, ini
	"application/vnd.oasis.opendocument.text", //odt
];

const mediaTypes: { name: string; key: keyof Socials }[] = [
	{ name: "Instagram", key: "instagram" },
	{ name: "LinkedIn", key: "linkedin" },
	{ name: "GitHub", key: "github" },
	{ name: "Discord", key: "discord" },
];

const visibilityOptions: ResumeVisibility[] = [
	"Public",
	"Sponsors Only",
	"Private",
];

const visibilityDescription = {
	Public:
		"Your resume will be visible to anyone who scans your ticket QR code.",
	Private: "Your resume will only be visible to you.",
	"Sponsors Only": "Your resume will only be visible to our sponsors.",
};
// const userApp = applications[0] || null;
// const [isLoading, setIsLoading] = useState(true);
// const [editMode, setEditMode] = useState("");
// const timeoutRef = useRef<number | null>(null);
// const gettinSocialsRef = useRef<boolean>(false);
// const socials = useUserStore((state) => state.socials);
// const setSocials = useUserStore((state) => state.setSocials);
// const [isResumeSettingsOpened, setIsResumeSettingsOpened] = useState(false);
// const [newVisibility, setNewVisibility] = useState<ResumeVisibility>(
// 	socials?.resumeVisibility ?? "Public",
// );

// const [file, setFile] = useState<File | null>(null);

// // State to keep track of each media account value
// const [mediaValues, setMediaValues] = useState<Socials>({
// 	instagram: "",
// 	linkedin: "",
// 	github: "",
// 	discord: "",
// 	resumeRef: "",
// 	docId: "",
// 	uid: "",
// 	resumeVisibility: "Public",
// });

// const firstName =
// 	userApp?.firstName || currentUser?.displayName?.split(" ")[0] || "Unknown";
// const lastName =
// 	userApp?.lastName || currentUser?.displayName?.split(" ")[1] || "Unknown";

// useEffect(() => {
// 	if (socials) {
// 		setIsLoading(false);
// 		setMediaValues({ ...socials });
// 		return;
// 	}

// 	if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
// 	timeoutRef.current = window.setTimeout(() => setIsLoading(false), 5000);

// 	(async () => {
// 		// avoid calling the function twice
// 		if (gettinSocialsRef.current) return;
// 		gettinSocialsRef.current = true;
// 		try {
// 			const res = await getSocials();
// 			const data = res.data;
// 			if (!data.resumeVisibility) data.resumeVisibility = "Public";
// 			setSocials(res.data);
// 			setMediaValues(res.data);
// 		} catch (e) {
// 			toaster.error({
// 				title: "Error Getting Socials",
// 				description: (e as Error).message,
// 			});
// 		} finally {
// 			if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
// 			setIsLoading(false);
// 		}
// 	})();

// 	return () => {
// 		if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
// 	};
// }, [userApp]);

// const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
// 	const selectedFiles = Array.from(e.target.files || []);
// 	setFile(selectedFiles[0] ?? null);
// 	setEditMode("resume");
// };

// const submitFile = async () => {
// 	if (!file || !currentUser || !userApp) return;

// 	const ref = await uploadGeneralResume(file, currentUser.uid);

// 	try {
// 		await updateSocials({ ...mediaValues, resumeRef: ref });
// 		setSocials(
// 			socials
// 				? {
// 						...socials,
// 						resumeRef: ref,
// 					}
// 				: null,
// 		);
// 		setMediaValues({
// 			...mediaValues,
// 			resumeRef: ref,
// 		});
// 		setEditMode("");
// 	} catch (e) {
// 		toaster.error({
// 			title: "Failed to upload resume",
// 			description: (e as Error).message,
// 		});
// 	}
// };

// const handleInputChange = (key: keyof Socials, value: string) => {
// 	setMediaValues((prev) => ({ ...prev, [key]: value }));
// 	setEditMode(key);
// };

// const handleSubmit: FormEventHandler = async (e) => {
// 	e.preventDefault();
// 	try {
// 		await updateSocials(mediaValues);
// 		setSocials({ ...mediaValues });
// 		setEditMode("");
// 	} catch (e) {
// 		toaster.error({
// 			title: "Failed to update socials",
// 			description: (e as Error).message,
// 		});
// 	}
// };

// const handleCancel = () => {
// 	setMediaValues({
// 		instagram: socials?.instagram ?? "",
// 		github: socials?.github ?? "",
// 		linkedin: socials?.linkedin ?? "",
// 		discord: socials?.discord ?? "",
// 		resumeRef: socials?.resumeRef ?? "",
// 		docId: socials?.docId ?? "",
// 		uid: socials?.uid ?? "",
// 	});
// 	setEditMode("");
// };

// const removeResume = async () => {
// 	if (mediaValues.resumeRef) {
// 		try {
// 			await updateSocials({
// 				...mediaValues,
// 				resumeRef: "",
// 				resumeVisibility: "Public",
// 			});
// 			setSocials({
// 				...mediaValues,
// 				resumeRef: "",
// 				resumeVisibility: "Public",
// 			});
// 			setMediaValues({
// 				...mediaValues,
// 				resumeRef: "",
// 				resumeVisibility: "Public",
// 			});
// 			setFile(null);
// 			setIsResumeSettingsOpened(false);
// 		} catch (error) {
// 			toaster.error({
// 				title: "Error",
// 				description: "Failed to remove resume. Please try again.",
// 			});
// 		}
// 	} else {
// 		toaster.error({
// 			title: "Error",
// 			description: "No resume found to remove.",
// 		});
// 	}
// };

// const openResumeSettings = () => {
// 	setIsResumeSettingsOpened(true);
// };

// const closeResumeSettings = () => {
// 	setIsResumeSettingsOpened(false);
// };

// const saveResumeSettings = async () => {
// 	try {
// 		await updateSocials({
// 			...mediaValues,
// 			resumeVisibility: newVisibility,
// 		});
// 		setSocials({
// 			...mediaValues,
// 			resumeVisibility: newVisibility,
// 		});
// 		setMediaValues({
// 			...mediaValues,
// 			resumeVisibility: newVisibility,
// 		});
// 		toaster.success({
// 			title: "Resume Settings Saved",
// 			description: "",
// 		});
// 		setIsResumeSettingsOpened(false);
// 		setEditMode("");
// 	} catch (error) {
// 		toaster.error({
// 			title: "Error",
// 			description: "Failed to save resume settings. Please try again.",
// 		});
// 	}
// };

// if (isLoading) return <LoadingAnimation />;
type FormErrors = { _hasErrors: boolean } & Partial<
	Record<ApplicationDataKey, string>
>;

export const AccountPage = () => {
	const { currentUser, resetPassword } = useAuth();
	const { applications } = useApplications();
	const userApp = applications[0] || null;
	const [errors, setErrors] = useState<FormErrors>({ _hasErrors: false });
	const [isSendingReset, setIsSendingReset] = useState(false);
	const [resetStatus, setResetStatus] = useState<"idle" | "success" | "error">(
		"idle",
	);
	const {
		isLoading: loadingApplications,
		drafts,
		refreshApplications,
		refreshDrafts,
	} = useApplications();

	// default user profile
	const [application, setApplication] = useState<ApplicationData>(() => {
		const app: ApplicationData = {
			...defaultApplication,
			email: currentUser?.email ?? "",
		};
		return app;
	});

	const draftId = useMemo(() => {
		if (drafts.length) return drafts[0].__docId;
		return undefined;
	}, [drafts]);

	const autosave = useDebounce(
		//@ts-ignore
		async (application: ApplicationDataDoc, uid: string) => {
			try {
				await saveApplicationDraft(application, uid, application.__docId);
				await refreshDrafts();
			} catch (error) {
				console.error(error);
				toaster.error({
					title: "Oops, something went wrong when saving application draft.",
					description: "",
				});
			}
		},
		500,
		[],
	);

	const handleChange = useCallback(
		<K extends ApplicationDataKey>(name: K, data: ApplicationData[K]) => {
			setApplication((application) => {
				const updatedApp = { ...application };
				updatedApp[name] = data;
				console.log(application);
				autosave(updatedApp, currentUser?.uid, draftId);
				return updatedApp;
			});
			clearErrors();
		},
		[currentUser?.uid],
	);

	const clearErrors = () => setErrors({ _hasErrors: false });

	const handlePasswordReset = async () => {
		if (!currentUser?.email) return;
		setIsSendingReset(true);
		setResetStatus("idle");
		try {
			await resetPassword(currentUser.email);
			setResetStatus("success");
			// toast({
			// 	title: "Reset email sent.",
			// 	description:
			// 		"Check your inbox for instructions to reset your password.",
			// 	status: "success",
			// 	duration: 5000,
			// 	isClosable: true,
			// });
		} catch (err) {
			console.error("Password reset failed:", err);
			setResetStatus("error");
			// toast({
			// 	title: "Failed to send reset link.",
			// 	description: "Please try again later.",
			// 	status: "error",
			// 	duration: 5000,
			// 	isClosable: true,
			// });
		} finally {
			setIsSendingReset(false);
		}
	};

	const testing = true;
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
							required
						/>
						<Button alignSelf="end" rounded="full">
							SEND VERIFICATION
						</Button>
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
								// visibilityIcon={{
								// 	on: (
								// 		<Icon
								// 			size="md"
								// 			color="#666484"
								// 			transition="colors"
								// 			_hover={{ color: "offwhite.primary" }}
								// 		>
								// 			<Eye />
								// 		</Icon>
								// 	),
								// 	off: (
								// 		<Icon
								// 			size="md"
								// 			color="#666484"
								// 			transition="colors"
								// 			_hover={{ color: "offwhite.primary" }}
								// 		>
								// 			<EyeClosed />
								// 		</Icon>
								// 	),
								// }}
							/>
						</Field>
						<Button
							onClick={handlePasswordReset}
							size="md"
							borderRadius="full"
							w="fit-content"
							alignSelf="end"
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
					<Flex direction="column" gap={4}>
						<Text color="offwhite.primary/30">CHANGE RSVP STATUS</Text>
						{/* {currentUser?.rsvpVerified ? ( */}
						{testing ? (
							<Flex alignItems="start" direction="column" gap={4}>
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
								>
									REVOKE RSVP STATUS
								</Button>
							</Flex>
						) : (
							<Text>No</Text>
						)}
					</Flex>
					<Flex alignItems="start" direction="column" gap={4}>
						<Text color="offwhite.primary/30">DANGER ZONE</Text>
						<Text color="offwhite.primary/30">
							Deleting your account means revoking your acceptance to SpurHacks
							2025. This action cannot be undone!
						</Text>
						<Button bg="brand.error" color="offwhite.primary" rounded="full">
							DELETE ACCOUNT
						</Button>
					</Flex>
				</Flex>
			</Flex>
		</PageWrapper>
	);
};
