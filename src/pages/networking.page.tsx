import { PageWrapper, Select, TextInput } from "@/components";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { toaster } from "@/components/ui/toaster";
import { useApplications } from "@/hooks/use-applications";
import { useAuth } from "@/providers";
import { getResumeURL, uploadGeneralResume, uploadProfilePicture, getProfilePictureURL } from "@/services/firebase/files";
import type { ResumeVisibility, Socials } from "@/services/firebase/types";
import { getSocials, updateSocials } from "@/services/firebase/user";
import { useUserStore } from "@/stores/user.store";
import { TextArea } from "@/components/TextArea/TextArea";
import { motion, AnimatePresence } from "framer-motion";
import {
	Box,
	Button,
	Dialog,
	Flex,
	Text,
	FileUpload,
	Stack,
	Image,
	Icon,
	Checkbox,
} from "@chakra-ui/react";
import { pronouns } from "@/data";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import {
	useEffect,
	useRef,
	useState,
} from "react";
import {
	MdOpenInNew,
	MdLink,
	MdOutlineFileUpload,
} from "react-icons/md";
import { IoMdTrash } from "react-icons/io";
import type {
	ApplicationData,
} from "@/forms/hacker-form/types";

import { useProfilePicture } from "@/hooks/use-profile-picture";
import { updateSubmittedApplicationField } from "@/services/firebase/application";



const mediaTypes: { name: string; key: keyof Socials }[] = [
	{ name: "LinkedIn", key: "linkedin" },
	{ name: "Instagram", key: "instagram" },
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

function mapOption(value?: string | string[]) {
	if (!value) return undefined;
	if (Array.isArray(value)) {
		return value.map((val) => ({ value: val, label: val }));
	}
	return {
		value: value,
		label: value,
	};
}

export const NetworkingPage = () => {
	const { currentUser } = useAuth();
	const { applications, refreshApplications } = useApplications();
	const userApp = applications[0] || null;
	const [isLoading, setIsLoading] = useState(true);
	const timeoutRef = useRef<number | null>(null);
	const gettinSocialsRef = useRef<boolean>(false);
	const socials = useUserStore((state) => state.socials);
	const setSocials = useUserStore((state) => state.setSocials);
	const { profilePictureUrl, setProfilePictureUrl } = useProfilePicture();
	const [isResumeSettingsOpened, setIsResumeSettingsOpened] = useState(false);
	const [newVisibility, setNewVisibility] = useState<ResumeVisibility>(
		socials?.resumeVisibility ?? "Public",
	);
	const [unsavedChanges, setUnsavedChanges] = useState<
		Partial<Record<keyof Socials, boolean>>
	>({});
	const { currentUser: user } = useAuth();

	const [file, setFile] = useState<File | null>(null);
	const [resumeConsent, setResumeConsent] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	const [isUploadingProfilePicture, setIsUploadingProfilePicture] = useState(false);

	const [aboutMe, setAboutMe] = useState(userApp?.aboutMe ?? "");
	const [aboutMeUnsaved, setAboutMeUnsaved] = useState(false);
	
	// unified profile picture success state
	const [profilePictureSuccess, setProfilePictureSuccess] = useState(false);
	const [profilePictureSuccessMessage, setProfilePictureSuccessMessage] = useState("");

	// global loading and success states
	const [isGlobalSaving, setIsGlobalSaving] = useState(false);
	const [globalSaveSuccess, setGlobalSaveSuccess] = useState(false);

	// global unsaved changes state
	const hasUnsavedChanges = aboutMeUnsaved || 
		Object.values(unsavedChanges).some(Boolean) || 
		(!!file && resumeConsent) || 
		(newVisibility !== (socials?.resumeVisibility ?? "Public"));

	// helper for profile picture success states
	const showProfilePictureSuccess = (message: string) => {
		setProfilePictureSuccess(true);
		setProfilePictureSuccessMessage(message);
		setTimeout(() => {
			setProfilePictureSuccess(false);
			setProfilePictureSuccessMessage("");
		}, 2000);
	};

	// animation variants for global button group
	const globalButtonVariants = {
		hidden: {
			opacity: 0,
			y: 20,
			transition: {
				duration: 0.3,
				ease: "easeInOut" as const
			}
		},
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.3,
				ease: "easeInOut" as const
			}
		},
		exit: {
			opacity: 0,
			y: 20,
			transition: {
				duration: 0.3,
				ease: "easeInOut" as const
			}
		}
	};



	useEffect(() => {
		if (userApp) {
			setAboutMe(userApp.aboutMe ?? "");
		}
	}, [userApp]);

	// State to keep track of each media account value
	const [mediaValues, setMediaValues] = useState<Socials>({
		instagram: "",
		linkedin: "",
		github: "",
		discord: "",
		website: "",
		resumeRef: "",
		resumeFilename: "",
		profilePictureRef: "",
		docId: "",
		uid: "",
		resumeVisibility: "Public",
		resumeConsent: false,
	});

	const firstName =
		userApp?.firstName || currentUser?.displayName?.split(" ")[0] || "Unknown";
	const lastName =
		userApp?.lastName || currentUser?.displayName?.split(" ")[1] || "Unknown";

	useEffect(() => {
		if (socials) {
			setIsLoading(false);
			setMediaValues({ ...socials });
			setResumeConsent(socials.resumeConsent ?? false);
			if (socials.profilePictureRef) {
				getProfilePictureURL(socials.profilePictureRef).then(url => {
					if (url) setProfilePictureUrl(url);
				});
			}
			return;
		}

		if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
		timeoutRef.current = window.setTimeout(() => setIsLoading(false), 5000);

		(async () => {
			// avoid calling the function twice
			if (gettinSocialsRef.current) return;
			gettinSocialsRef.current = true;
			try {
				const res = await getSocials();
				const data = res.data;
				if (!data.resumeVisibility) data.resumeVisibility = "Public";
				setSocials(data);
				setMediaValues(data);
				setResumeConsent(data.resumeConsent ?? false);
				// load profile picture url if available
				if (data.profilePictureRef) {
					const url = await getProfilePictureURL(data.profilePictureRef);
					setProfilePictureUrl(url);
				}
			} catch (e) {
				toaster.error({
					title: "Error Getting Socials",
					description: (e as Error).message,
				});
			} finally {
				if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
				setIsLoading(false);
			}
		})();

		return () => {
			if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [userApp]);

	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = Array.from(e.target.files || []);
		const selectedFile = selectedFiles[0] ?? null;
		setFile(selectedFile);
		
		if (selectedFile) {
			const url = URL.createObjectURL(selectedFile);
			setPreviewUrl(url);
		} else {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
			setPreviewUrl(null);
		}
	};

	const handleProfilePictureInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = Array.from(e.target.files || []);
		const file = selectedFiles[0];
		if (!file || !currentUser || isUploadingProfilePicture) return;

		setIsUploadingProfilePicture(true);
		try {
			const ref = await uploadProfilePicture(file, currentUser.uid);
			const updateData = {
				instagram: mediaValues.instagram || "",
				linkedin: mediaValues.linkedin || "",
				github: mediaValues.github || "",
				discord: mediaValues.discord || "",
				website: mediaValues.website || "",
				resumeRef: mediaValues.resumeRef || "",
				profilePictureRef: ref,
				docId: mediaValues.docId,
				uid: mediaValues.uid,
				resumeVisibility: mediaValues.resumeVisibility || "Public",
			};
			console.log("Sending update data:", updateData);
			await updateSocials(updateData);
			setSocials(
				socials
					? {
							...socials,
							profilePictureRef: ref,
						}
					: null,
			);
			setMediaValues({
				...mediaValues,
				profilePictureRef: ref,
			});
			
			// update the profile picture url for display
			const url = await getProfilePictureURL(ref);
			if (url) setProfilePictureUrl(url);
			
			toaster.success({
				title: "Profile picture uploaded successfully!",
			});
			showProfilePictureSuccess("✓ UPLOADED!");
		} catch (e) {
			toaster.error({
				title: "Failed to upload profile picture",
				description: (e as Error).message,
			});
		} finally {
			setIsUploadingProfilePicture(false);
		}
	};



	const removeProfilePicture = async () => {
		try {
			await updateSocials({ ...mediaValues, profilePictureRef: "" });
			setSocials({
				...mediaValues,
				profilePictureRef: "",
			});
			setMediaValues({
				...mediaValues,
				profilePictureRef: "",
			});
			setProfilePictureUrl(null);
			toaster.success({
				title: "Profile picture removed successfully!",
			});
			showProfilePictureSuccess("✓ REMOVED!");
		} catch (error) {
			toaster.error({
				title: "Error",
				description: "Failed to remove profile picture. Please try again.",
			});
		}
	};

	const handleInputChange = (key: keyof Socials, value: string) => {
		setMediaValues((prev) => ({ ...prev, [key]: value }));
		setUnsavedChanges((prev) => ({ ...prev, [key]: true }));
	};

	const handleConsentChange = (checked: boolean) => {
		setResumeConsent(checked);
		setMediaValues((prev) => ({ ...prev, resumeConsent: checked }));
		setUnsavedChanges((prev) => ({ ...prev, resumeConsent: true }));
	};

	// global save function
	const handleGlobalSave = async () => {
		setIsGlobalSaving(true);
		
		try {
			const savePromises = [];

			// save about me if changed
			if (aboutMeUnsaved) {
				savePromises.push(updateSubmittedApplicationField("aboutMe", aboutMe));
			}

			// save social media links if changed
			if (Object.values(unsavedChanges).some(Boolean)) {
				savePromises.push(updateSocials(mediaValues));
			}

			// save resume if file selected and consent given
			if (file && currentUser) {
				if (!resumeConsent) {
					throw new Error("Please consent to resume sharing before uploading your resume.");
				}
				const ref = await uploadGeneralResume(file, currentUser.uid);
				const updatedMediaValues = { ...mediaValues, resumeRef: ref, resumeFilename: file.name, resumeConsent: true };
				savePromises.push(updateSocials(updatedMediaValues));
				setMediaValues(updatedMediaValues);
				setSocials(socials ? { ...socials, resumeRef: ref, resumeFilename: file.name, resumeConsent: true } : null);
				setFile(null);
			}

			// save resume settings if changed
			if (newVisibility !== (socials?.resumeVisibility ?? "Public")) {
				const updatedMediaValues = { ...mediaValues, resumeVisibility: newVisibility };
				savePromises.push(updateSocials(updatedMediaValues));
				setMediaValues(updatedMediaValues);
				setSocials(socials ? { ...socials, resumeVisibility: newVisibility } : null);
			}

			await Promise.all(savePromises);

			// refresh applications if about me was updated
			if (aboutMeUnsaved) {
				await refreshApplications();
			}

			// update global state
			setSocials(mediaValues);
			
			// clear all unsaved states
			setAboutMeUnsaved(false);
			setUnsavedChanges({});
			setIsResumeSettingsOpened(false);

			// show success state
			setGlobalSaveSuccess(true);
			setTimeout(() => {
				setGlobalSaveSuccess(false);
			}, 2000);

			toaster.success({
				title: "Changes saved successfully!",
				description: "All your updates have been saved.",
			});

		} catch (error) {
			const errorMessage = (error as Error).message;
			if (errorMessage.includes("consent")) {
				toaster.error({
					title: "Consent Required",
					description: errorMessage,
				});
			} else {
				toaster.error({
					title: "Failed to save changes",
					description: "Please try again.",
				});
			}
		} finally {
			setIsGlobalSaving(false);
		}
	};

	// Global cancel function
	const handleGlobalCancel = () => {
		// Revert about me
		setAboutMe(userApp?.aboutMe ?? "");
		setAboutMeUnsaved(false);

		// Revert social media values
		setMediaValues({
			instagram: socials?.instagram ?? "",
			github: socials?.github ?? "",
			linkedin: socials?.linkedin ?? "",
			discord: socials?.discord ?? "",
			website: socials?.website ?? "",
			resumeRef: socials?.resumeRef ?? "",
			resumeFilename: socials?.resumeFilename ?? "",
			profilePictureRef: socials?.profilePictureRef ?? "",
			docId: socials?.docId ?? "",
			uid: socials?.uid ?? "",
			resumeVisibility: socials?.resumeVisibility ?? "Public",
			resumeConsent: socials?.resumeConsent ?? false,
		});
		setUnsavedChanges({});

		// Revert file selection and consent
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		setFile(null);
		setPreviewUrl(null);
		setResumeConsent(socials?.resumeConsent ?? false);

		// Revert resume settings
		setNewVisibility(socials?.resumeVisibility ?? "Public");

		// Close resume settings modal
		setIsResumeSettingsOpened(false);
	};

	const removeResume = async () => {
		if (mediaValues.resumeRef) {
			try {
							await updateSocials({
				...mediaValues,
				resumeRef: "",
				resumeFilename: "",
				resumeVisibility: "Public",
			});
			setSocials({
				...mediaValues,
				resumeRef: "",
				resumeFilename: "",
				resumeVisibility: "Public",
			});
			setMediaValues({
				...mediaValues,
				resumeRef: "",
				resumeFilename: "",
				resumeVisibility: "Public",
			});
				setFile(null);
				setIsResumeSettingsOpened(false);
				toaster.success({
					title: "Resume removed successfully!",
				});
			} catch (error) {
				toaster.error({
					title: "Error",
					description: "Failed to remove resume. Please try again.",
				});
			}
		} else {
			toaster.error({
				title: "Error",
				description: "No resume found to remove.",
			});
		}
	};

	const handleAboutMeChange = (value: string) => {
		setAboutMe(value);
		setAboutMeUnsaved(true);
	};

	const handlePronounChange = async (
		field: keyof ApplicationData,
		value: string[],
	) => {
		try {
			await updateSubmittedApplicationField(field, value);
			await refreshApplications();
			toaster.success({
				title: "Pronouns updated",
				description: "Your pronouns have been updated successfully.",
			});
		} catch (error) {
			toaster.error({
				title: "Error updating pronouns",
				description: "Please try again.",
			});
		}
	};



	if (isLoading) return <LoadingAnimation />;

	return (
		<PageWrapper>
			<Flex direction="column" maxW="700px" gap={5} pb={hasUnsavedChanges ? "120px" : "0"}>
				{/* Profile picture */}
				<Text color="offwhite.primary/30">PERSONAL INFORMATION</Text>
				<Flex alignItems="center" gap={3}>
					<Box
						boxSize="80px"
						borderRadius="full"
						bg="gray.600"
						display="flex"
						alignItems="center"
						justifyContent="center"
						overflow="hidden"
					>
						<Image
							src={profilePictureUrl || user?.photoURL || "/default-profile.png"}
							alt="Profile Picture"
							boxSize="full"
							borderRadius="full"
							objectFit="cover"
						/>
					</Box>
					<Flex direction="column" gap={2}>
						<Flex align="center" gap={2}>
							<Text color="white" fontWeight="medium">
								Profile Picture
							</Text>
							<Text color="gray.500" fontStyle="italic" fontSize="sm">
								optional
							</Text>
						</Flex>
						{profilePictureUrl || mediaValues.profilePictureRef ? (
							<Button
								size="sm"
								variant="outline"
								rounded="full"
								borderColor={profilePictureSuccess ? "#10b981" : "gray.500"}
								borderWidth="2px"
								color={profilePictureSuccess ? "#10b981" : "gray.500"}
								bg="transparent"
								fontWeight="bold"
								_hover={{
									borderColor: profilePictureSuccess ? "#10b981" : "red.500",
									color: profilePictureSuccess ? "#10b981" : "red.500",
									bg: "transparent",
								}}
								onClick={removeProfilePicture}
								disabled={isUploadingProfilePicture || profilePictureSuccess}
								transition="all 0.3s ease-in-out"
							>
								{profilePictureSuccess ? profilePictureSuccessMessage : isUploadingProfilePicture ? "REMOVING..." : "REMOVE PICTURE"}
							</Button>
						) : (
							<FileUpload.Root accept="image/*" maxW="full">
								<FileUpload.HiddenInput onChange={handleProfilePictureInput} disabled={isUploadingProfilePicture} />
								<FileUpload.Trigger asChild>
									<Button
										size="sm"
										borderRadius="full"
										variant="outline"
										fontWeight="bold"
										loading={isUploadingProfilePicture}
										disabled={isUploadingProfilePicture || profilePictureSuccess}
										bg="transparent"
										color={profilePictureSuccess ? "#10b981" : "inherit"}
										borderColor={profilePictureSuccess ? "#10b981" : "inherit"}
										borderWidth={profilePictureSuccess ? "2px" : "1px"}
										_hover={{ 
											bg: "transparent",
											color: profilePictureSuccess ? "#10b981" : "inherit",
											borderColor: profilePictureSuccess ? "#10b981" : "inherit"
										}}
										transition="all 0.3s ease-in-out"
									>
										{profilePictureSuccess ? profilePictureSuccessMessage : isUploadingProfilePicture ? "UPLOADING..." : "SET PICTURE"}
									</Button>
								</FileUpload.Trigger>
							</FileUpload.Root>
						)}
					</Flex>
				</Flex>

				<Flex gap={10} align="center">
					<Box flex={1}>
						<Flex align="center" gap={2} mb={2}>
							<Text>First Name</Text>
							<Text color="gray.600" fontStyle="italic" fontSize="sm">
								optional
							</Text>
						</Flex>
						<TextInput
							label=""
							type="text"
							defaultValue={firstName}
							description=""
							disabled
						/>
					</Box>
					<Box flex={1}>
						<Flex align="center" gap={2} mb={2}>
							<Text>Last Name</Text>
							<Text color="gray.600" fontStyle="italic" fontSize="sm">
								optional
							</Text>
						</Flex>
						<TextInput
							label=""
							type="text"
							defaultValue={lastName}
							description=""
							disabled
						/>
					</Box>
				</Flex>
				<Box>
					<Flex align="center" gap={2} mb={2}>
						<Text>About me</Text>
						<Text color="gray.600" fontStyle="italic" fontSize="sm">
							optional
						</Text>
					</Flex>
					<TextArea
						value={aboutMe}
						label=""
						placeholder="Share a fun fact"
						onChange={(e) => handleAboutMeChange(e.target.value)}
						rows={4}
					/>
				</Box>
				<Box maxW="450px">
					<Flex align="center" gap={2} mb={2}>
						<Text>Pronouns</Text>
						<Text color="gray.600" fontStyle="italic" fontSize="sm">
							optional
						</Text>
					</Flex>
					<Select
						value={mapOption(userApp.pronouns)}
						label=""
						placeholder="Select your pronouns"
						options={pronouns}
						onChange={(opts) => handlePronounChange("pronouns", opts)}
						allowCustomValue
					/>
				</Box>
				<Text color="offwhite.primary/30" mt={6}>
					CONNECTIONS
				</Text>
				<Box
					display="flex"
					flexDirection="column"
					maxW="md"
					gap={5}
					mt={2}
				>
					{mediaTypes.map(({ name, key }) => (
						<Box key={key} rounded="xl" display="flex" flexDirection="column">
							<Flex mb={2} justify="space-between" align="center">
								<Flex flex={1} align="center" gap={2}>
									<Text>{name}</Text>
									<Text color="gray.600" fontStyle="italic" fontSize="sm">
										optional
									</Text>
								</Flex>
							</Flex>
							<Box position="relative">
								<TextInput
									label=""
									type="text"
									rounded="full"
									px={4}
									py={6}
									pl={12}
									placeholder={`Add your ${name}!`}
									value={mediaValues[key] as string}
									onChange={(e) => handleInputChange(key, e.target.value)}
								/>
								<Box
									position="absolute"
									left={4}
									top="50%"
									transform="translateY(-50%)"
									pointerEvents="none"
								>
									<Icon as={MdLink} boxSize={5} color="gray.400" />
								</Box>
							</Box>
						</Box>
					))}
					<Text color="offwhite.primary/30" my={4}>
						PORTFOLIO
					</Text>

					<Box rounded="xl" display="flex" flexDirection="column">
						<Flex mb={2} justify="space-between" align="center">
							<Flex flex={1} align="center" gap={2}>
								<Text>Website</Text>
								<Text color="gray.600" fontStyle="italic" fontSize="sm">
									optional
								</Text>
							</Flex>
						</Flex>
						<Box position="relative">
							<TextInput
								label=""
								type="text"
								rounded="full"
								px={4}
								py={6}
								pl={12}
								placeholder="https://yourportfolio.com"
								value={mediaValues.website || ""}
								onChange={(e) => handleInputChange("website", e.target.value)}
							/>
							<Box
								position="absolute"
								left={4}
								top="50%"
								transform="translateY(-50%)"
								pointerEvents="none"
							>
								<Icon as={MdLink} boxSize={5} color="gray.400" />
							</Box>
						</Box>
					</Box>

					{/* RESUME UPLOAD */}
					<Box rounded="xl" display="flex" flexDirection="column">
						<Flex mb={2} justify="space-between" align="center">
							<Flex flex={1} align="center" gap={2}>
								<Text>Resume</Text>
								<Text color="gray.600" fontStyle="italic" fontSize="sm">
									optional
								</Text>
							</Flex>
							{mediaValues.resumeRef && (
								<Button
									size="sm"
									variant="ghost"
									color="gray.400"
									p={2}
									minW="auto"
									bg="transparent"
									_hover={{ bg: "gray.600" }}
									onClick={() => setIsResumeSettingsOpened(true)}
									title="Resume Settings"
								>
									<Icon as={Cog6ToothIcon} boxSize={5} />
								</Button>
							)}
						</Flex>

						<FileUpload.Root accept=".pdf" w="full">
							<FileUpload.HiddenInput onChange={handleFileInput} />
							<FileUpload.Dropzone
								bg="transparent"
								border="2px dashed"
								borderColor="#1f1e2d"
								borderRadius="lg"
								p={3}
								textAlign="center"
								cursor="pointer"
								w="full"
								_hover={{
									borderColor: "#2d2a3d"
								}}
								transition="all 0.2s"
							>
								<Stack align="center" gap={6}>
									<Icon as={MdOutlineFileUpload} boxSize={6} color="#4e4b66" />
									<Text color="#4e4b66" fontSize="lg" fontWeight="medium">
										Drag and drop your resume here
									</Text>
									<Flex align="center" gap={3} w="full">
										<Box flex={1} h="1px" bg="#4e4b66" />
										<Text color="#4e4b66" fontSize="sm">
											OR
										</Text>
										<Box flex={1} h="1px" bg="#4e4b66" />
									</Flex>
									<FileUpload.Trigger asChild>
										<Text
											fontSize="md"
											cursor="pointer"
										>
											<Text as="span" color="gray.300" fontWeight="bold" _hover={{ color: "gray.200" }}>
												Choose a file
											</Text>
											<Text as="span" color="#4e4b66">
												{" "}to upload
											</Text>
										</Text>
									</FileUpload.Trigger>
									<Text color="#4e4b66" fontSize="xs">
										.PDF only
									</Text>
								</Stack>
							</FileUpload.Dropzone>
						</FileUpload.Root>

						<AnimatePresence>
							{file && (
								<motion.div
									key="file-preview"
									initial={mediaValues.resumeRef ? { opacity: 1, y: 0, height: "auto" } : { opacity: 0, y: -10, height: 0 }}
									animate={{ opacity: 1, y: 0, height: "auto" }}
									exit={{ opacity: 0, y: -10, height: 0 }}
									transition={mediaValues.resumeRef ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
									style={{ overflow: "hidden" }}
								>
									<Box
										bg="#1f1e2d"
										borderRadius="4xl"
										p={4}
										w="full"
										mt={3}
										opacity={resumeConsent ? 1 : 0.5}
										transition="all 0.2s"
									>
										<Flex align="center" gap={3}>
											{/* PDF Icon */}
											<Box
												minW="20px"
												h="20px"
												display="flex"
												alignItems="center"
												justifyContent="center"
											>
												<Image
													src="/icons/pdf-icon.png"
													alt="PDF file"
													boxSize="30px"
													objectFit="contain"
													onError={(e) => {
														e.currentTarget.style.display = 'none';
													}}
												/>
												<Box
													borderRadius="md"
													p={2}
													minW="40px"
													h="40px"
													display="flex"
													alignItems="center"
													justifyContent="center"
													position="absolute"
													zIndex={-1}
												>
													<Text color="white" fontSize="xs" fontWeight="bold">
														PDF
													</Text>
												</Box>
											</Box>
											
											{/* Filename */}
											<Box flex={1}>
												<Text color="white" fontWeight="medium" fontSize="md">
													{file.name.length > 30 ? `${file.name.substring(0, 30)}...` : file.name}
												</Text>
											</Box>
											
											{/* Action buttons */}
											<Flex gap={1}>
												<Button
													size="sm"
													variant="ghost"
													color="gray.400"
													p={2}
													minW="auto"
													bg="transparent"
													_hover={{ bg: "transparent" }}
													_active={{ bg: "transparent" }}
													_focus={{ bg: "transparent" }}
													onClick={() => {
														if (previewUrl) {
															window.open(previewUrl, "_blank", "noopener,noreferrer");
														}
													}}
												>
													<Icon as={MdOpenInNew} boxSize={6} />
												</Button>
												<Button
													size="sm"
													variant="ghost"
													color="red.400"
													p={2}
													minW="auto"
													bg="transparent"
													_hover={{ bg: "transparent" }}
													_active={{ bg: "transparent" }}
													_focus={{ bg: "transparent" }}
													onClick={() => {
														if (previewUrl) {
															URL.revokeObjectURL(previewUrl);
														}
														setFile(null);
														setPreviewUrl(null);
													}}
												>
													<Icon as={IoMdTrash} boxSize={6} />
												</Button>
											</Flex>
										</Flex>
									</Box>
								</motion.div>
							)}
						</AnimatePresence>

						{mediaValues.resumeRef && !file && (
							<Box
								bg="#1f1e2d"
								borderRadius="4xl"
								p={4}
								w="full"
								mt={3}
							>
								<Flex align="center" gap={3}>
									{/* PDF Icon */}
									<Box
										minW="20px"
										h="20px"
										display="flex"
										alignItems="center"
										justifyContent="center"
									>
										<Image
											src="/icons/pdf-icon.png"
											alt="PDF file"
											boxSize="30px"
											objectFit="contain"
											onError={(e) => {
												e.currentTarget.style.display = 'none';
											}}
										/>
										<Box
											bg="#dc2626"
											borderRadius="md"
											p={2}
											minW="40px"
											h="40px"
											display="flex"
											alignItems="center"
											justifyContent="center"
											position="absolute"
											zIndex={-1}
										>
											<Text color="white" fontSize="xs" fontWeight="bold">
												PDF
											</Text>
										</Box>
									</Box>
									
									{/* Filename */}
									<Box flex={1}>
										<Text color="white" fontWeight="medium" fontSize="md">
											{mediaValues.resumeFilename ? 
												(mediaValues.resumeFilename.length > 30 ? `${mediaValues.resumeFilename.substring(0, 30)}...` : mediaValues.resumeFilename) 
												: "Resume.pdf"}
										</Text>
									</Box>
									
									{/* Action buttons */}
									<Flex gap={1}>
										<Button
											size="sm"
											variant="ghost"
											color="gray.400"
											p={2}
											minW="auto"
											bg="transparent"
											_hover={{ bg: "transparent" }}
											_active={{ bg: "transparent" }}
											_focus={{ bg: "transparent" }}
											onClick={async () => {
												if (mediaValues.resumeRef) {
													try {
														const url = await getResumeURL(mediaValues.resumeRef);
														window.open(url, "_blank", "noopener,noreferrer");
													} catch (error) {
														toaster.error({
															title: "Error",
															description: "Failed to open resume. Please try again.",
														});
													}
												}
											}}
										>
											<Icon as={MdOpenInNew} boxSize={6} />
										</Button>
										<Button
											size="sm"
											variant="ghost"
											color="red.400"
											p={2}
											minW="auto"
											bg="transparent"
											_hover={{ bg: "transparent" }}
											_active={{ bg: "transparent" }}
											_focus={{ bg: "transparent" }}
											onClick={removeResume}
										>
											<Icon as={IoMdTrash} boxSize={6} />
										</Button>
									</Flex>
								</Flex>
							</Box>
						)}

						{/* Consent checkbox */}
						<Checkbox.Root
							checked={resumeConsent}
							onCheckedChange={(details) => handleConsentChange(details.checked === true)}
							mt={4}
							alignItems="flex-start"
						>
							<Checkbox.HiddenInput />
							<Checkbox.Control
								borderColor="gray.500"
								_checked={{
									bg: "#f9a857",
									borderColor: "#f9a857",
									color: "black"
								}}
							/>
							<Checkbox.Label>
								<Text color="gray.300" fontSize="sm" lineHeight="1.4" ml={2}>
									I consent to SpurHacks giving my resume and connections to recruiters and potential employers
								</Text>
							</Checkbox.Label>
						</Checkbox.Root>
					</Box>
				</Box>
			</Flex>

			{/* Global Save/Cancel Buttons */}
			<AnimatePresence>
				{hasUnsavedChanges && (
					<motion.div
						key="global-save-buttons"
						variants={globalButtonVariants}
						initial="hidden"
						animate="visible"
						exit="exit"
						style={{
							position: "fixed",
							bottom: "24px",
							right: "24px",
							zIndex: 1000,
						}}
					>
						<Flex gap={3} align="center">
							<Button
								variant="outline"
								color="gray.400"
								borderColor="gray.500"
								borderWidth="2px"
								rounded="full"
								px={6}
								fontWeight="bold"
								onClick={handleGlobalCancel}
								_hover={{ bg: "gray.800", borderColor: "gray.400" }}
								disabled={isGlobalSaving}
							>
								CANCEL
							</Button>
							<Button
								bg={globalSaveSuccess ? "transparent" : "#f9a857"}
								color={globalSaveSuccess ? "#10b981" : "black"}
								borderColor={globalSaveSuccess ? "#10b981" : "transparent"}
								borderWidth={globalSaveSuccess ? "2px" : "0"}
								variant={globalSaveSuccess ? "outline" : "solid"}
								rounded="full"
								px={6}
								fontWeight="bold"
								onClick={handleGlobalSave}
								_hover={{ 
									bg: globalSaveSuccess ? "transparent" : "#e0974d",
									borderColor: globalSaveSuccess ? "#10b981" : "transparent"
								}}
								boxShadow={globalSaveSuccess ? "none" : "0 0 20px rgba(249, 168, 87, 0.4)"}
								loading={isGlobalSaving}
								disabled={isGlobalSaving || globalSaveSuccess}
								transition="all 0.3s ease-in-out"
							>
								{globalSaveSuccess ? "✓ SAVED!" : isGlobalSaving ? "SAVING..." : "SAVE CHANGES"}
							</Button>
						</Flex>
					</motion.div>
				)}
			</AnimatePresence>

			<Dialog.Root
				open={isResumeSettingsOpened}
				onOpenChange={(details: { open: boolean }) => !details.open && setIsResumeSettingsOpened(false)}
			>
				<Dialog.Backdrop />
				<Dialog.Positioner>
					<Dialog.Content rounded="4xl" maxWidth="500px">
						<Dialog.Header>
							<Dialog.Title>Resume Settings</Dialog.Title>
						</Dialog.Header>
						<Dialog.Body>
							<Stack gap={6}>
								<Box>
									<Select 
										label="Resume Visibility" 
										options={visibilityOptions} 
										value={mapOption(newVisibility)}
										onChange={(selected) => {
											if (selected && selected.length > 0) {
												setNewVisibility(selected[0] as ResumeVisibility);
											}
										}}
									/>
									<Text color="fg.muted" fontSize="sm" mt={2}>
										{visibilityDescription[newVisibility]}
									</Text>
								</Box>	
							</Stack>
						</Dialog.Body>
						<Dialog.CloseTrigger asChild>
							<Button variant="ghost" size="sm" aria-label="Close" />
						</Dialog.CloseTrigger>
					</Dialog.Content>
				</Dialog.Positioner>
			</Dialog.Root>
		</PageWrapper>
	);
};
