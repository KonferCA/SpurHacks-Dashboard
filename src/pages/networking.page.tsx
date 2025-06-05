import { Modal, PageWrapper, Select } from "@/components";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { toaster } from "@/components/ui/toaster";
import { useApplications } from "@/hooks/use-applications";
import { useAuth } from "@/providers";
import { getResumeURL, uploadGeneralResume } from "@/services/firebase/files";
import type { ResumeVisibility, Socials } from "@/services/firebase/types";
import { getSocials, updateSocials } from "@/services/firebase/user";
import { useUserStore } from "@/stores/user.store";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { type FormEventHandler, useEffect, useRef, useState } from "react";
import {
	MdOpenInNew,
	MdOutlineEdit,
	MdOutlineRemoveCircleOutline,
	MdWarning,
} from "react-icons/md";

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

export const NetworkingPage = () => {
	const { currentUser } = useAuth();
	const { applications } = useApplications();
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

	const [file, setFile] = useState<File | null>(null);

	// State to keep track of each media account value
	const [mediaValues, setMediaValues] = useState<Socials>({
		instagram: "",
		linkedin: "",
		github: "",
		discord: "",
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
		setEditMode(key);
	};

	const handleSubmit: FormEventHandler = async (e) => {
		e.preventDefault();
		try {
			await updateSocials(mediaValues);
			setSocials({ ...mediaValues });
			setEditMode("");
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
			resumeRef: socials?.resumeRef ?? "",
			docId: socials?.docId ?? "",
			uid: socials?.uid ?? "",
		});
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

	if (isLoading) return <LoadingAnimation />;

	return (
		<PageWrapper>
			<div>
				<div className="flex items-center gap-10">
					<h1 className="font-bold text-2xl">
						{firstName} {lastName}
					</h1>
					{userApp && <p>{userApp.pronouns}</p>}
				</div>
				<p className="mt-6">Your connections</p>
				<div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg mt-6 flex items-center max-w-md">
					<MdWarning className="mr-4 text-3xl" />
					<p>Information you enter on this page will be publicly visible.</p>
				</div>
				<form className="flex flex-col max-w-md gap-5 mt-12">
					{mediaTypes.map(({ name, key }) => (
						<div
							key={key}
							className="bg-white shadow-md p-4 rounded-xl flex flex-col"
						>
							<div className="mb-2 flex justify-between items-center">
								<p className="flex-1">{name}</p>
								{mediaValues[key] && (
									<p
										className={`rounded-full px-4 py-1 ${
											editMode === key
												? " text-gray-500 italic "
												: "bg-green-300"
										}`}
									>
										{editMode === key ? "Unsaved Changes" : "Complete"}
									</p>
								)}
							</div>
							<div className="relative">
								<input
									className="bg-peachWhite border-0 rounded-lg text-gray-500 pr-7 w-full"
									type="text"
									placeholder={`Add your ${name}!`}
									value={mediaValues[key]}
									onChange={(e) => handleInputChange(key, e.target.value)}
								/>
								{mediaValues[key] && (
									<MdOutlineEdit className="text-gray-500 absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5" />
								)}
							</div>

							{editMode === key && (
								<div className="mt-2 flex gap-2">
									<button
										type="button"
										className="bg-gray-300/30 rounded-lg px-4 py-1"
										onClick={handleCancel}
									>
										Cancel
									</button>
									<button
										type="button"
										className="bg-peachWhite text-black rounded-lg px-4 py-1"
										onClick={handleSubmit}
									>
										Save
									</button>
								</div>
							)}
						</div>
					))}

					{/* RESUME UPLOAD */}
					<div className="bg-white shadow-md p-4 rounded-xl flex flex-col">
						<div className="mb-2 flex justify-between items-center">
							<span className="flex-1 gap-2">
								<p className="">Resume</p>
							</span>
							{socials?.resumeRef ? (
								<p className="bg-green-300 rounded-full px-4 py-1">
									Resume Uploaded
								</p>
							) : (
								<p className="bg-red-500 rounded-full px-4 py-1 text-white">
									Not Uploaded
								</p>
							)}
						</div>

						<div className="flex items-center gap-4">
							<label
								htmlFor="resume-file-input"
								className="flex-grow rounded-lg px-4 py-2 bg-peachWhite hover:cursor-pointer overflow-hidden"
							>
								<span className="block overflow-hidden text-ellipsis whitespace-nowrap">
									{file ? file.name : "Select new resume file"}
								</span>
								<input
									id="resume-file-input"
									className="sr-only"
									type="file"
									accept={allowedFileTypes.join(", ")}
									onChange={handleFileInput}
								/>
							</label>
							{mediaValues.resumeRef && (
								<>
									<button
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
									</button>
									<button
										title="Resume Settings"
										type="button"
										className="p-2 bg-peachWhite rounded-lg flex items-center justify-center hover:cursor-pointer flex-shrink-0"
										onClick={openResumeSettings}
									>
										<Cog6ToothIcon className="w-6 h-6 text-gray-500" />
									</button>
								</>
							)}
						</div>
						{editMode === "resume" && (
							<div className="mt-4 flex gap-2">
								<button
									type="button"
									className="bg-gray-300/30 rounded-lg px-4 py-1"
									onClick={() => {
										setFile(null);
										setEditMode("");
									}}
								>
									Cancel
								</button>
								<button
									type="button"
									className="bg-peachWhite text-black rounded-lg px-4 py-1"
									onClick={submitFile}
								>
									Save
								</button>
							</div>
						)}
						{mediaValues.resumeRef && (
							<div className="mt-2">
								<p className="text-sm text-gray-500">
									{visibilityDescription[socials?.resumeVisibility ?? "Public"]}
								</p>
							</div>
						)}
					</div>
				</form>
			</div>
			<Modal
				title="Resume Settings"
				subTitle=""
				open={isResumeSettingsOpened}
				onClose={closeResumeSettings}
			>
				<div className="space-y-12">
					<div>
						<Select label="Resume Visibility" options={visibilityOptions} />
						<p>{visibilityDescription[newVisibility]}</p>
						{editMode === "resume-visibility" && (
							<div className="mt-4 flex gap-2">
								<button
									type="button"
									className="bg-gray-300/30 rounded-lg px-4 py-1"
									onClick={() => {
										setNewVisibility(socials?.resumeVisibility ?? "Public");
										setEditMode("");
									}}
								>
									Cancel
								</button>
								<button
									type="button"
									className="bg-peachWhite text-black rounded-lg px-4 py-1"
									onClick={saveResumeSettings}
								>
									Save
								</button>
							</div>
						)}
					</div>
					<div>
						<button
							type="button"
							className="border-2 rounded-lg border-red-400 w-full flex p-2 gap-4 transition hover:bg-red-600/5 text-red-500 font-medium"
							onClick={removeResume}
						>
							<span>
								<MdOutlineRemoveCircleOutline className="text-red-500 w-6 h-6" />
							</span>
							Remove Resume
						</button>
					</div>
				</div>
			</Modal>
		</PageWrapper>
	);
};
