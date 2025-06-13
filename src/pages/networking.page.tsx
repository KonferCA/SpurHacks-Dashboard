import { Modal, PageWrapper, Select, TextInput } from "@/components";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { toaster } from "@/components/ui/toaster";
import { useApplications } from "@/hooks/use-applications";
import { useAuth } from "@/providers";
import { getResumeURL, uploadGeneralResume } from "@/services/firebase/files";
import type { ResumeVisibility, Socials } from "@/services/firebase/types";
import { getSocials, updateSocials } from "@/services/firebase/user";
import { useUserStore } from "@/stores/user.store";
import { TextArea } from "@/components/TextArea/TextArea";
import {
	Box,
	Button,
	Flex,
	Text,
	Input,
	FileUpload,
	Stack,
	Image,
} from "@chakra-ui/react";
import { pronouns } from "@/data";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import {
	type FormEventHandler,
	useCallback,
	useEffect,
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
import { useDebounce } from "@/hooks/use-debounce";
import { updateSubmittedApplicationField } from "@/services/firebase/application";

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
	const [editMode, setEditMode] = useState("");
	const timeoutRef = useRef<number | null>(null);
	const gettinSocialsRef = useRef<boolean>(false);
	const socials = useUserStore((state) => state.socials);
	const setSocials = useUserStore((state) => state.setSocials);
	const [isResumeSettingsOpened, setIsResumeSettingsOpened] = useState(false);
	const [newVisibility, setNewVisibility] = useState<ResumeVisibility>(
		socials?.resumeVisibility ?? "Public",
	);
	const [unsavedChanges, setUnsavedChanges] = useState<
		Partial<Record<keyof Socials, boolean>>
	>({});
	const { currentUser: user } = useAuth();

	const [file, setFile] = useState<File | null>(null);

	// State to keep track of each media account value
	const [mediaValues, setMediaValues] = useState<Socials>({
		instagram: "",
		linkedin: "",
		github: "",
		discord: "",
		website: "",
		resumeRef: "",
		docId: "",
		uid: "",
		resumeVisibility: "Public",
	});

	const firstName =
		userApp?.firstName || currentUser?.displayName?.split(" ")[0] || "Unknown";
	const lastName =
		userApp?.lastName || currentUser?.displayName?.split(" ")[1] || "Unknown";

	useEffect(() => {
		if (socials) {
			setIsLoading(false);
			setMediaValues({ ...socials });
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
				setSocials(res.data);
				setMediaValues(res.data);
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
		};
	}, [userApp]);

	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = Array.from(e.target.files || []);
		setFile(selectedFiles[0] ?? null);
		setEditMode("resume");
	};

	const submitFile = async () => {
		if (!file || !currentUser || !userApp) return;

		const ref = await uploadGeneralResume(file, currentUser.uid);

		try {
			await updateSocials({ ...mediaValues, resumeRef: ref });
			setSocials(
				socials
					? {
							...socials,
							resumeRef: ref,
						}
					: null,
			);
			setMediaValues({
				...mediaValues,
				resumeRef: ref,
			});
			setEditMode("");
		} catch (e) {
			toaster.error({
				title: "Failed to upload resume",
				description: (e as Error).message,
			});
		}
	};

	const handleInputChange = (key: keyof Socials, value: string) => {
		setMediaValues((prev) => ({ ...prev, [key]: value }));
		setUnsavedChanges((prev) => ({ ...prev, [key]: true }));
	};

	const handleSubmit: FormEventHandler = async (e) => {
		e.preventDefault();
		try {
			await updateSocials(mediaValues);
			setSocials({ ...mediaValues });
			setEditMode("");
			setUnsavedChanges({});
		} catch (e) {
			toaster.error({
				title: "Failed to update socials",
				description: (e as Error).message,
			});
		}
	};

	const handleCancel = () => {
		setMediaValues({
			instagram: socials?.instagram ?? "",
			github: socials?.github ?? "",
			linkedin: socials?.linkedin ?? "",
			discord: socials?.discord ?? "",
			website: socials?.website ?? "",
			resumeRef: socials?.resumeRef ?? "",
			docId: socials?.docId ?? "",
			uid: socials?.uid ?? "",
		});
		setUnsavedChanges({});
		setEditMode("");
	};

	const removeResume = async () => {
		if (mediaValues.resumeRef) {
			try {
				await updateSocials({
					...mediaValues,
					resumeRef: "",
					resumeVisibility: "Public",
				});
				setSocials({
					...mediaValues,
					resumeRef: "",
					resumeVisibility: "Public",
				});
				setMediaValues({
					...mediaValues,
					resumeRef: "",
					resumeVisibility: "Public",
				});
				setFile(null);
				setIsResumeSettingsOpened(false);
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

	const openResumeSettings = () => {
		setIsResumeSettingsOpened(true);
	};

	const closeResumeSettings = () => {
		setIsResumeSettingsOpened(false);
	};

	const saveResumeSettings = async () => {
		try {
			await updateSocials({
				...mediaValues,
				resumeVisibility: newVisibility,
			});
			setSocials({
				...mediaValues,
				resumeVisibility: newVisibility,
			});
			setMediaValues({
				...mediaValues,
				resumeVisibility: newVisibility,
			});
			toaster.success({
				title: "Resume Settings Saved",
				description: "",
			});
			setIsResumeSettingsOpened(false);
			setEditMode("");
		} catch (error) {
			toaster.error({
				title: "Error",
				description: "Failed to save resume settings. Please try again.",
			});
		}
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

	const handleAboutMeChange = async (
		field: keyof ApplicationData,
		value: string,
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
			<Flex direction="column" mx="auto" gap={5}>
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
							src={user?.photoURL ?? "/default-profile.png"}
							alt="Profile Picture"
							boxSize="full"
							borderRadius="full"
							objectFit="cover"
						/>
					</Box>
					<Flex direction="column" gap={2}>
						<Text color="white" fontWeight="medium">
							Profile Picture
						</Text>
						<FileUpload.Root accept={allowedFileTypes.join(", ")} maxW="full">
							<FileUpload.HiddenInput onChange={handleFileInput} />
							<FileUpload.Trigger asChild>
								{user?.photoURL ? (
									<Button
										size="sm"
										color="red.400"
										borderRadius="full"
										variant="outline"
										fontWeight="bold"
										_hover={{ bg: "red.900", borderColor: "red.500" }}
									>
										REMOVE PICTURE
									</Button>
								) : (
									<Button
										size="sm"
										borderRadius="full"
										variant="outline"
										fontWeight="bold"
									>
										SET PICTURE
									</Button>
								)}
								{/* <Button
										variant="outline"
										w="full"
										px={4}
										py={2}
										rounded="lg"
										bg="peachWhite"
										textAlign="left"
									>
										<Text truncate>
											{file ? file.name : "Select new resume file"}
										</Text>
									</Button> */}
							</FileUpload.Trigger>
						</FileUpload.Root>
					</Flex>
				</Flex>

				<Flex gap={10} align="center">
					<TextInput
						label="First Name"
						type="text"
						defaultValue={firstName}
						required
						description=""
						disabled
					/>
					<TextInput
						label="Last Name"
						type="text"
						defaultValue={lastName}
						required
						description=""
						disabled
					/>
				</Flex>
				<TextArea
					value={userApp?.aboutMe}
					label="About me"
					placeholder="Share a fun fact"
					onChange={(text) => handleAboutMeChange("aboutMe", text)}
					rows={4}
				/>
				<Select
					value={mapOption(userApp.pronouns)}
					label="Pronouns"
					placeholder="Select your pronouns"
					options={pronouns}
					onChange={(opts) => handlePronounChange("pronouns", opts)}
					allowCustomValue
				/>
				<Text color="offwhite.primary/30" mt={6}>
					CONNECTIONS
				</Text>
				<Box
					as="form"
					display="flex"
					flexDirection="column"
					maxW="md"
					gap={5}
					mt={2}
				>
					{mediaTypes.map(({ name, key }) => (
						<Box key={key} rounded="xl" display="flex" flexDirection="column">
							<Flex mb={2} justify="space-between" align="center">
								<Text flex={1}>{name}</Text>
								{mediaValues[key] && (
									<Text
										px={4}
										py={1}
										rounded="full"
										fontStyle={unsavedChanges[key] ? "italic" : "normal"}
										color={unsavedChanges[key] ? "gray.500" : "black"}
										bg={unsavedChanges[key] ? "transparent" : "green.300"}
									>
										{unsavedChanges[key] ? "Unsaved Changes" : "Complete"}
									</Text>
								)}
							</Flex>
							<Box position="relative">
								<TextInput
									label=""
									type="text"
									rounded="full"
									px={4}
									py={6}
									placeholder={`Add your ${name}!`}
									value={mediaValues[key]}
									onChange={(e) => handleInputChange(key, e.target.value)}
								/>
							</Box>
						</Box>
					))}
					{Object.values(unsavedChanges).some(Boolean) && (
						<Flex mt={2} gap={2}>
							<Button
								type="button"
								bg="gray.300"
								color="black"
								rounded="lg"
								px={4}
								py={1}
								onClick={handleCancel}
								_hover={{ bg: "gray.400" }}
							>
								Cancel
							</Button>
							<Button
								type="button"
								color="black"
								rounded="lg"
								px={4}
								py={1}
								onClick={handleSubmit}
								_hover={{ bg: "orange.200" }}
							>
								Save
							</Button>
						</Flex>
					)}
					<Text color="offwhite.primary/30" my={4}>
						PORTFOLIO
					</Text>

					{/* RESUME UPLOAD */}
					<Box rounded="xl" display="flex" flexDirection="column">
						<TextInput
							mb={4}
							label="Website"
							type="text"
							placeholder="https://yourportfolio.com"
							defaultValue={socials?.website ?? ""}
							onChange={(e) =>
								handleInputChange("website", e.target.value.trim())
							}
						/>
						<Flex mb={2} justify="space-between" align="center">
							<Flex flex={1} gap={2}>
								<Text>Resume</Text>
							</Flex>
							{socials?.resumeRef ? (
								<Text bg="green.300" rounded="full" px={4} py={1}>
									Resume Uploaded
								</Text>
							) : (
								<Text bg="red.500" color="white" rounded="full" px={4} py={1}>
									Not Uploaded
								</Text>
							)}
						</Flex>

						<Flex align="center" gap={4}>
							<FileUpload.Root accept={allowedFileTypes.join(", ")} maxW="full">
								<FileUpload.HiddenInput onChange={handleFileInput} />
								<FileUpload.Trigger asChild>
									<Button
										variant="outline"
										w="full"
										px={4}
										py={2}
										rounded="lg"
										bg="peachWhite"
										textAlign="left"
									>
										<Text truncate>
											{file ? file.name : "Select new resume file"}
										</Text>
									</Button>
								</FileUpload.Trigger>
							</FileUpload.Root>
							{mediaValues.resumeRef && (
								<>
									<Button
										title="Open Resume in new tab"
										type="button"
										className="p-2 bg-peachWhite rounded-lg flex items-center justify-center hover:cursor-pointer flex-shrink-0"
										onClick={async () => {
											if (mediaValues.resumeRef) {
												try {
													const url = await getResumeURL(mediaValues.resumeRef);
													window.open(url, "_blank", "noopener,noreferrer");
												} catch (error) {
													toaster.error({
														title: "Error",
														description:
															"Failed to open resume. Please try again.",
													});
												}
											} else {
												toaster.error({
													title: "Error",
													description: "No resume found to open.",
												});
											}
										}}
									>
										<MdOpenInNew className="text-gray-500 w-6 h-6" />
									</Button>
									<Button
										title="Resume Settings"
										type="button"
										className="p-2 bg-peachWhite rounded-lg flex items-center justify-center hover:cursor-pointer flex-shrink-0"
										onClick={openResumeSettings}
									>
										<Cog6ToothIcon className="w-6 h-6 text-gray-500" />
									</Button>
								</>
							)}
						</Flex>
						{editMode === "resume" && (
							<Flex mt={4} gap={2}>
								<Button
									type="button"
									bg="gray.300"
									color="black"
									rounded="lg"
									px={4}
									py={1}
									_hover={{ bg: "gray.400" }}
									onClick={() => {
										setFile(null);
										setEditMode("");
									}}
								>
									Cancel
								</Button>
								<Button
									type="button"
									color="black"
									rounded="lg"
									px={4}
									py={1}
									_hover={{ bg: "orange.200" }}
									onClick={submitFile}
								>
									Save
								</Button>
							</Flex>
						)}
						{mediaValues.resumeRef && (
							<Box mt={2}>
								<Text fontSize="sm" color="gray.500">
									{visibilityDescription[socials?.resumeVisibility ?? "Public"]}
								</Text>
							</Box>
						)}
					</Box>
				</Box>
			</Flex>
			<Modal
				title="Resume Settings"
				subTitle=""
				open={isResumeSettingsOpened}
				onClose={closeResumeSettings}
			>
				<Stack gap={12}>
					<Box>
						<Select label="Resume Visibility" options={visibilityOptions} />
						<Text>{visibilityDescription[newVisibility]}</Text>
						{editMode === "resume-visibility" && (
							<Flex mt={4} gap={2}>
								<Button
									type="button"
									bg="gray.300"
									color="black"
									rounded="lg"
									px={4}
									py={1}
									onClick={() => {
										setNewVisibility(socials?.resumeVisibility ?? "Public");
										setEditMode("");
									}}
									_hover={{ bg: "gray.400" }}
								>
									Cancel
								</Button>
								<Button
									type="button"
									bg="peachWhite"
									color="black"
									rounded="lg"
									px={4}
									py={1}
									onClick={saveResumeSettings}
									_hover={{ bg: "orange.100" }}
								>
									Save
								</Button>
							</Flex>
						)}
					</Box>
					<Box>
						<Button
							type="button"
							onClick={removeResume}
							variant="outline"
							borderColor="red.400"
							color="red.500"
							w="full"
							display="flex"
							gap={4}
							fontWeight="medium"
							_hover={{ bg: "red.600", opacity: 0.05 }}
							px={4}
							py={2}
							rounded="lg"
						>
							<Box
								as={MdOutlineRemoveCircleOutline}
								boxSize={6}
								color="red.500"
							/>
							Remove Resume
						</Button>
					</Box>
				</Stack>
			</Modal>
		</PageWrapper>
	);
};
