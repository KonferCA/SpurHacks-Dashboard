import { FileBrowser } from "@/components/FileBrowse/FileBrowse";
import { Modal } from "@/components/Modal";
import { TextArea } from "@/components/TextArea/TextArea";
import { defaultApplication } from "@/forms/hacker-form/defaults";
import type {
	ApplicationData,
	ApplicationDataKey,
} from "@/forms/hacker-form/types";
import { validations } from "@/forms/hacker-form/validations";
import type { Step } from "@/components/types";
import { toaster } from "@/components/ui/toaster";
import {
	ages,
	allergies,
	cityNames,
	countryNames,
	diets,
	genders,
	hackathonExps,
	interests,
	levelsOfStudy,
	majorsList,
	programmingLanguages,
	pronouns,
	races,
	referralSources,
	schools,
	sexualityList,
} from "@/data";
import { useApplications } from "@/hooks/use-applications";
import { useAuth } from "@/providers";
import { paths } from "@/providers/RoutesProvider/data";
import { analytics } from "@/services/firebase";
import { submitApplication } from "@/services/firebase/application";
import { uploadGeneralResume } from "@/services/firebase/files";
import { Button } from "@chakra-ui/react";
import {
	LoadingAnimation,
	MultiSelect,
	PageWrapper,
	Select,
	Steps,
	TextInput,
} from "@components";
import { logEvent } from "firebase/analytics";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { PhoneInput } from "@/components/PhoneInput/PhoneInput";

// Define fields to validate for each step
const stepFields: ApplicationDataKey[][] = [
	// Step 0: Basic profile
	[
		"firstName",
		"lastName",
		"age",
		"discord",
		"countryOfResidence",
		"city",
		"phone",
		"school",
		"levelOfStudy",
		"major",
	],

	// Step 1: Hacker questions
	["reasonToBeInHawkHacks", "revolutionizingTechnology"],

	// Step 2: Application
	[
		"gender",
		"pronouns",
		"sexuality",
		"race",
		"diets",
		"allergies",
		"interests",
		"hackathonExperience",
		"programmingLanguages",
	],

	// Step 3: Final checks
	["referralSources", "describeSalt"],
];

// Form validations
function getLogEventName(component: string) {
	if (import.meta.env.PROD) return `app_interaction_${component}`;
	return "dev_app_interaction"; // not logging the different components becuase it will fill the reports with spam
}

export const ApplyPage = () => {
	// TODO: save steps in firebase to save progress
	const [steps, setSteps] = useState<Step[]>([
		{ position: 0, name: "Basic profile", status: "current" },
		{ position: 1, name: "Hacker questions", status: "upcoming" },
		{ position: 2, name: "Application", status: "upcoming" },
		{ position: 3, name: "Final checks", status: "upcoming" },
	]);
	const [activeStep, setActiveStep] = useState(0); // index
	const [errors, setErrors] = useState<string[]>([]);
	const { currentUser } = useAuth();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [generalResumeFile, setGeneralResumeFile] = useState<File | null>(null);
	const [submitted, setSubmitted] = useState(false);
	const [openConfirmPopUp, setOpenConfirmPopUp] = useState(false);
	const {
		applications,
		isLoading: loadingApplications,
		refreshApplications,
	} = useApplications();
	const userApp = applications[0] || null;
	const progressTrackRef = useRef(new Set<string>());
	const [sp] = useSearchParams();
	const navigate = useNavigate();

	if (!currentUser) return <Navigate to={paths.login} />;

	// we start with the default user profile
	const [application, setApplication] = useState<ApplicationData>(() => {
		const app: ApplicationData = {
			...defaultApplication,
		};
		return app;
	});

	useEffect(() => {
		if (userApp && !sp.get("restart")) {
			setApplication({
				...userApp,
			});
		}
	}, [userApp, sp]);

	const trackProgress = (component: string) => {
		try {
			const event = getLogEventName(component);
			if (!progressTrackRef.current.has(event)) {
				logEvent(analytics, event);
				progressTrackRef.current.add(event);
			}
		} catch (e) {
			console.error(e);
		}
	};

	const handleChange = useCallback(
		<K extends ApplicationDataKey>(name: K, data: ApplicationData[K]) => {
			if (name === "phone") console.log(data);
			setApplication((application) => {
				const updatedApp = { ...application };
				updatedApp[name] = data;
				return updatedApp;
			});
			trackProgress(name);

			// Clear errors
			clearErrors();
		},
		[],
	);

	const clearErrors = () => setErrors([]);

	const validateField = <K extends ApplicationDataKey>(field: K) => {
		if (validations[field]) {
			return validations[field](application[field]);
		}
		return null;
	};

	const validateCurrentStep = () => {
		clearErrors();

		const fieldsToValidate = stepFields[activeStep];
		const stepErrors: string[] = [];

		for (const field of fieldsToValidate) {
			const error = validateField(field);
			if (error) {
				stepErrors.push(error);
			}
		}

		if (stepErrors.length > 0) {
			setErrors(stepErrors);
			return false;
		}

		return true;
	};

	const validate = () => {
		clearErrors();
		const allErrors: string[] = [];

		// Validate all required fields
		Object.keys(validations).forEach((field) => {
			const key = field as keyof ApplicationData;
			const error = validateField(key);
			if (error) {
				allErrors.push(error);
			}
		});

		if (allErrors.length > 0) {
			setErrors(allErrors);
			return false;
		}

		return true;
	};

	const nextStep = () => {
		if (activeStep < steps.length) {
			// Validate current step before proceeding
			if (!validateCurrentStep()) return;

			trackProgress(`step_${activeStep}`);
			setSteps((s) => {
				s[activeStep].status = "complete";
				s[activeStep + 1].status = "current";
				return s;
			});
			setActiveStep((s) => s + 1);
		}
	};

	const prevStep = () => {
		if (activeStep > 0) {
			setActiveStep((s) => s - 1);
		}
	};

	const jumpTo = (step: number) => {
		if (step > -1 && step < steps.length) {
			if (step <= activeStep) {
				setActiveStep(step);
			} else {
				// Validate all steps up to the target step
				for (let i = activeStep; i < step; i++) {
					setActiveStep(i);
					if (!validateCurrentStep()) return;
				}
				setActiveStep(step);
			}
		}
	};

	const submitApp = async (e?: FormEvent) => {
		if (e) {
			e.preventDefault();
		}

		clearErrors();

		// If we're not on the final step, just validate the current step
		if (activeStep !== steps.length - 1) {
			if (!validateCurrentStep()) return;
			nextStep();
			return;
		}

		// On the final step, validate the current step first
		if (!validateCurrentStep()) return;

		// Then validate the entire form before submission
		if (!validate()) return;

		const allRequiredChecked =
			// don't have the CoC for HH yet so we don't have to make it required for now
			// application.agreedToHawkHacksCoC &&
			application.agreedToWLUCoC &&
			application.agreedToMLHCoC &&
			application.agreedToMLHToCAndPrivacyPolicy;

		if (!allRequiredChecked) {
			setErrors(["Please read and check all the required boxes to proceed."]);
			return;
		}

		if (userApp && !openConfirmPopUp) {
			// show pop up to confirm resubmission
			setOpenConfirmPopUp(true);
			return;
		}

		setIsSubmitting(true);

		try {
			if (generalResumeFile) {
				application.generalResumeRef = await uploadGeneralResume(
					generalResumeFile,
					currentUser.uid,
				);
			}
		} catch (e) {
			console.error(e);
			toaster.error({
				title: "Error uploading sponsor resume",
				description: "Please try again later.",
			});
			setIsSubmitting(false);
			return;
		}

		try {
			trackProgress("submit");
			application.email = currentUser.email as string;
			await submitApplication(application, currentUser.uid);
			toaster.success({
				title: "Application Submitted!",
				description:
					"Thank you for applying! You'll hear from us via email within one week after applications close on June 6th.",
			});
			await refreshApplications();
		} catch (e) {
			toaster.error({
				title: "Error Submitting Application",
				description: "Please retry later.",
			});
			console.error(e);
		} finally {
			setSubmitted(true);
			setIsSubmitting(false);
		}
	};

	const handlePhoneChange = useCallback(
		(phone: string) => {
			handleChange("phone", phone);
		},
		[handleChange],
	);

	useEffect(() => {
		if (!loadingApplications && !userApp) {
			trackProgress("open");
		}
	}, [userApp, loadingApplications]);

	if (loadingApplications)
		return (
			<PageWrapper>
				<LoadingAnimation />
			</PageWrapper>
		);

	if (submitted) return <Navigate to={paths.submitted} />;

	return (
		<PageWrapper>
			<div>
				<nav aria-label="Application progress">
					<Steps steps={steps} onClick={jumpTo} />
				</nav>
				{errors.length > 0 ? (
					<div className="my-8">{/* <ErrorAlert errors={errors} /> */}</div>
				) : null}
				<h3 className="text-center my-8">
					All fields with an <span className="font-bold">asterisk</span> are{" "}
					<span className="font-bold">required</span>.
				</h3>
				<form onSubmit={submitApp} className="mt-12">
					{/* basic profile */}
					<div
						className={`mx-auto lg:grid max-w-4xl space-y-8 lg:gap-x-6 lg:gap-y-8 lg:space-y-0 lg:grid-cols-6${
							activeStep !== 0 ? " hidden lg:hidden" : ""
						}`}
					>
						<div className="sm:col-span-3">
							<TextInput
								label="What is your first name?"
								type="text"
								id="firstName"
								autoComplete="given-name"
								placeholder="Steven"
								value={application.firstName}
								onChange={(e) => handleChange("firstName", e.target.value)}
								required
							/>
						</div>

						<div className="sm:col-span-3">
							<TextInput
								label="What is your last name?"
								type="text"
								id="lastName"
								autoComplete="family-name"
								placeholder="Wu"
								value={application.lastName}
								onChange={(e) => handleChange("lastName", e.target.value)}
								required
							/>
						</div>

						<div className="sm:col-span-2">
							<Select
								label="How old are you?"
								options={ages}
								initialValue={application.age ?? ""}
								onChange={(opt) => handleChange("age", opt)}
								required
							/>
						</div>
						<div className="sm:col-span-4">
							<TextInput
								label="What is your Discord username?"
								id="discord"
								placeholder="@username or username#1234"
								value={application.discord}
								onChange={(e) => handleChange("discord", e.target.value)}
								description="Discord will be our primary form of communication."
								required
							/>
						</div>

						<div className="sm:col-span-3">
							<Select
								label="Which country do you currently reside in?"
								options={countryNames}
								initialValue={application.countryOfResidence ?? ""}
								onChange={(opt) => handleChange("countryOfResidence", opt)}
								required
							/>
						</div>

						<div className="sm:col-span-3">
							<Select
								label="Which city do you live in?"
								options={cityNames}
								initialValue={application.city ?? ""}
								onChange={(opt) => handleChange("city", opt)}
								allowCustomValue
								required
							/>
						</div>

						<div className="col-span-6">
							<PhoneInput required onChange={handlePhoneChange} />
						</div>

						<div className="sm:col-span-3">
							<Select
								label="Which school are you currently attending?"
								options={schools}
								initialValue={application.school ?? ""}
								onChange={(opt) => handleChange("school", opt)}
								allowCustomValue
								required
							/>
							<p className="mt-2 text-sageGray">
								If you recently graduated, pick the school you graduated from.
							</p>
						</div>
						<div className="sm:col-span-3">
							<Select
								label="What is your current level of study?"
								options={levelsOfStudy}
								initialValue={application.levelOfStudy ?? ""}
								onChange={(opt) => handleChange("levelOfStudy", opt)}
								required
							/>
						</div>

						<div className="sm:col-span-full">
							<MultiSelect
								label="What is your major/field of study?"
								options={majorsList}
								onChange={(opts) => handleChange("major", opts)}
								initialValues={
									application.major.length ? application.major : []
								}
								allowCustomValue
								required
							/>
						</div>

						{/* end of basic profile */}

						{/* hacker specific questions */}
						<div
							className={`mx-auto sm:grid max-w-2xl space-y-8 sm:gap-x-6 sm:gap-y-8 sm:space-y-0 sm:grid-cols-6${
								activeStep !== 1 ? " hidden sm:hidden" : ""
							}`}
						>
							<div className="sm:col-span-full space-y-4">
								<input type="hidden" name="participatingAs" value="Hacker" />
							</div>
							<div className="sm:col-span-full">
								<TextArea
									id="hacker-specific-q1"
									label="Why do you want to participate at HawkHacks?"
									rows={4}
									required
									onChange={(e) =>
										handleChange("reasonToBeInHawkHacks", e.target.value)
									}
									value={
										application.reasonToBeInHawkHacks
											? application.reasonToBeInHawkHacks
											: ""
									}
								/>
							</div>
							<div className="sm:col-span-full">
								<TextArea
									id="hacker-specific-q2"
									label="In a few sentences, what up-and-coming or revolutionizing technology are you most excited about?"
									rows={4}
									required
									onChange={(e) =>
										handleChange("revolutionizingTechnology", e.target.value)
									}
									value={
										application.revolutionizingTechnology
											? application.revolutionizingTechnology
											: ""
									}
								/>
							</div>
						</div>
						{/* end of hacker specific questions */}

						{/* general questions */}
						<div
							className={`mx-auto sm:grid max-w-2xl space-y-8 sm:gap-x-6 sm:gap-y-8 sm:space-y-0 sm:grid-cols-6${
								activeStep !== 2 ? " hidden sm:hidden" : ""
							}`}
						>
							<div className="sm:col-span-full">
								<Select
									label="What gender do you identify as?"
									options={genders}
									allowCustomValue={true}
									required={true}
									onChange={(opt) => handleChange("gender", opt)}
									initialValue={application.gender || ""}
								/>
							</div>
							<div className="sm:col-span-full">
								<MultiSelect
									label="What are your pronouns?"
									options={pronouns}
									allowCustomValue={true}
									required={true}
									onChange={(opts) => handleChange("pronouns", opts)}
									initialValues={
										application.pronouns.length > 0 ? application.pronouns : []
									}
								/>
							</div>
							<div className="sm:col-span-full">
								<Select
									label="Please select any of the following that resonates with you:"
									options={sexualityList}
									allowCustomValue={true}
									required={true}
									onChange={(opt) => handleChange("sexuality", opt)}
									initialValue={application.sexuality || ""}
								/>
							</div>
							<div className="sm:col-span-full">
								<Select
									label="Which of the following best describes your racial or ethnic background?"
									options={races}
									allowCustomValue={false}
									required={true}
									onChange={(opt) => handleChange("race", opt)}
									initialValue={application.race || ""}
								/>
							</div>
							<div className="sm:col-span-full">
								<MultiSelect
									label="Do you have any dietary restrictions?"
									options={diets}
									allowCustomValue={true}
									required={true}
									onChange={(opts) => handleChange("diets", opts)}
									initialValues={
										application.diets.length > 0 ? application.diets : []
									}
								/>
							</div>
							<div className="sm:col-span-full">
								<MultiSelect
									label="Are there any allergens you have that we should be aware of?"
									options={allergies}
									allowCustomValue={true}
									required={true}
									onChange={(opts) => handleChange("allergies", opts)}
									initialValues={
										application.allergies.length > 0
											? application.allergies
											: []
									}
								/>
							</div>
							<div className="sm:col-span-full">
								<MultiSelect
									label="Which of the following fields interests you?"
									options={interests}
									allowCustomValue={true}
									required={true}
									onChange={(opts) => handleChange("interests", opts)}
									initialValues={
										application.interests.length > 0
											? application.interests
											: []
									}
								/>
							</div>
							<div className="sm:col-span-full">
								<Select
									label="How many Hackathons have you attended as a participant in the past?"
									options={hackathonExps}
									required={true}
									onChange={(opt) => handleChange("hackathonExperience", opt)}
									initialValue={application.hackathonExperience || ""}
								/>
							</div>
							<div className="sm:col-span-full">
								<MultiSelect
									label="What programming languages are you the most comfortable with or passionate about?"
									options={programmingLanguages}
									allowCustomValue={true}
									onChange={(opts) =>
										handleChange("programmingLanguages", opts)
									}
									initialValues={
										application.programmingLanguages.length > 0
											? application.programmingLanguages
											: []
									}
								/>
							</div>
						</div>
						{/* end of general questions */}

						{/* final steps - agreements */}
						<div
							className={`mx-auto sm:grid max-w-2xl space-y-8 sm:gap-x-6 sm:gap-y-8 sm:space-y-0 sm:grid-cols-6${
								activeStep !== 3 ? " hidden sm:hidden" : ""
							}`}
						>
							<div className="sm:col-span-full">
								<p className="text-gray-900 font-medium">
									If you would like to share your resume with our sponsors,
									please do so now.
								</p>
								<p className="text-sm italic">
									Sponsors will be conducting coffee chats/interviews during the
									hackathon, or might reach out via email for career or job
									opportunities.
								</p>
								<FileBrowser
									inputId="sponsors-resume-file-input"
									allowedFileTypes={[
										"image/*", //png, jpg, jpeg, jfif, pjpeg, pjp, gif, webp, bmp, svg
										"application/pdf", //pdf
										"application/msword", //doc, dot, wiz
										"application/vnd.openxmlformats-officedocument.wordprocessingml.document", //docx
										"application/rtf", //rtf
										"application/oda", //oda
										"text/markdown", //md, markdown, mdown, markdn
										"text/plain", //txt, text, conf, def, list, log, in, ini
										"application/vnd.oasis.opendocument.text", //odt
									]}
									onChange={(file) => {
										file && setGeneralResumeFile(file);
									}}
								/>
							</div>
							<div className="sm:col-span-full">
								<MultiSelect
									label="How did you hear about us?"
									options={referralSources}
									onChange={(opts) => handleChange("referralSources", opts)}
									allowCustomValue
									required
									initialValues={
										application.referralSources.length > 0
											? application.referralSources
											: []
									}
								/>
							</div>
							<div className="sm:col-span-full">
								<TextInput
									label="How would you describe the taste of salt to someone who hasn't tasted it, and can't ever taste it?"
									id="funsie-1"
									onChange={(e) => handleChange("describeSalt", e.target.value)}
									required
									value={application.describeSalt}
								/>
							</div>
							<div className="sm:col-span-full h-12" />
							<div className="sm:col-span-full flex items-start gap-x-2">
								<input
									type="checkbox"
									checked={application.agreedToWLUCoC}
									onChange={(e) =>
										handleChange("agreedToWLUCoC", e.target.checked)
									}
								/>
								<p>
									* I have read and agree to abide by the{" "}
									<a
										href="https://www.wlu.ca/about/governance/assets/resources/12.3-non-academic-student-code-of-conduct.html"
										target="_blank"
										rel="noopener noreferrer"
										className="text-sky-600 underline"
									>
										Wilfrid Laurier University Code of Conduct
									</a>{" "}
									during the hackathon.
								</p>
							</div>
							<div className="sm:col-span-full flex items-start gap-x-2">
								<input
									type="checkbox"
									checked={application.agreedToMLHCoC}
									onChange={(e) =>
										handleChange("agreedToMLHCoC", e.target.checked)
									}
								/>
								<p>
									* I have read and agree to the{" "}
									<a
										className="text-sky-600 underline"
										href="https://static.mlh.io/docs/mlh-code-of-conduct.pdf"
									>
										MLH Code of Conduct
									</a>
									.
								</p>
							</div>
							<div className="sm:col-span-full flex items-start gap-x-2">
								<input
									type="checkbox"
									checked={application.agreedToMLHToCAndPrivacyPolicy}
									onChange={(e) =>
										handleChange(
											"agreedToMLHToCAndPrivacyPolicy",
											e.target.checked,
										)
									}
								/>
								<p>
									* I authorize you to share my application/registration
									information with Major League Hacking for event
									administration, ranking, and MLH administration in line with
									the{" "}
									<a
										className="text-sky-600 underline"
										href="https://mlh.io/privacy"
									>
										MLH Privacy Policy
									</a>
									. I further agree to the terms of both the{" "}
									<a
										className="text-sky-600 underline"
										href="https://github.com/MLH/mlh-policies/blob/main/contest-terms.md)and"
									>
										MLH Contest Terms and Conditions
									</a>
									.
								</p>
							</div>
							<div className="sm:col-span-full flex items-start gap-x-2">
								<input
									type="checkbox"
									checked={application.agreedToReceiveEmailsFromMLH}
									onChange={(e) =>
										handleChange(
											"agreedToReceiveEmailsFromMLH",
											e.target.checked,
										)
									}
								/>
								<p>
									I authorize MLH to send me occasional emails about relevant
									events, career opportunities, and community announcements.
								</p>
							</div>
						</div>
						{/* end of final steps - agreements */}
					</div>
					{/* adding some more white space between the last input field and the buttons */}
					<div className="h-12 md:h-28" />
					{/* just a separator line */}
					<div className="h-0.5 bg-gray-300 my-6" />
					<div>
						{errors.length > 0 ? (
							<p className="text-center text-red-600">
								Oh no! It appears that the are errors in the form.
							</p>
						) : null}
					</div>
					<div className="flex items-center justify-between px-4 py-4 sm:px-8">
						<div className="space-x-4">
							<Button
								disabled={activeStep === 0 || isSubmitting}
								onClick={prevStep}
								type="button"
							>
								Back
							</Button>
							<Button
								className="text-charcoalBlack"
								onClick={() => navigate(paths.home)}
								type="button"
							>
								Cancel
							</Button>
						</div>
						<Button
							type="submit"
							disabled={isSubmitting}
							// I mean.... why not? for funsies
							className={isSubmitting ? "animate-spin" : ""}
						>
							{isSubmitting
								? "Submitting..."
								: activeStep === steps.length - 1
									? userApp
										? "Re-submit"
										: "Submit"
									: "Next"}
						</Button>
					</div>
				</form>
			</div>

			<Modal
				title="Confirm Re-submission"
				subTitle=""
				open={openConfirmPopUp}
				onClose={() => setOpenConfirmPopUp(false)}
			>
				<div className="mt-12 space-y-4 text-center">
					<p>This will replace your previous submission.</p>
					<p>Are you sure you want to continue?</p>
				</div>
				<div className="flex gap-12 justify-center items-center mt-12">
					<Button onClick={() => setOpenConfirmPopUp(false)}>Cancel</Button>
					<Button
						onClick={() => {
							submitApp();
						}}
					>
						Confirm
					</Button>
				</div>
			</Modal>
		</PageWrapper>
	);
};
