import { FileBrowser } from "@/components/FileBrowse/FileBrowse";
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
import {
	Box,
	Button,
	Checkbox,
	Flex,
	GridItem,
	Heading,
	SimpleGrid,
	Steps,
	Text,
	Link as ChakraLink,
	Field,
} from "@chakra-ui/react";
import { LoadingAnimation, PageWrapper, Select, TextInput } from "@components";
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
			application.agreedToMLHCoC && application.agreedToMLHToCAndPrivacyPolicy;

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
				<Box as="nav" aria-label="Application progress" marginBottom="2rem">
					<Steps.Root
						step={activeStep}
						defaultStep={0}
						count={steps.length}
						onStepChange={(e) => jumpTo(e.step)}
					>
						<Steps.List>
							{steps.map((step, index) => (
								<Steps.Item key={step.position} index={index} title={step.name}>
									<Steps.Trigger>
										<Steps.Indicator />
										<Steps.Title>{step.name}</Steps.Title>
									</Steps.Trigger>
									<Steps.Separator />
								</Steps.Item>
							))}
						</Steps.List>
					</Steps.Root>
				</Box>
				<Heading size="md" textAlign="center" marginY="2rem">
					All fields with an asterisk{"(*)"} are required.
				</Heading>
				<form onSubmit={submitApp} className="mt-12">
					{/* basic profile */}
					{activeStep === 0 && (
						<SimpleGrid marginX="auto" columns={6} gapX="1.5rem" gapY="2rem">
							<GridItem colSpan={{ base: 6, sm: 3 }}>
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
							</GridItem>

							<GridItem colSpan={{ base: 6, sm: 3 }}>
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
							</GridItem>

							<GridItem colSpan={{ base: 6, sm: 2 }}>
								<Select
									label="How old are you?"
									options={ages}
									onChange={(opt) => handleChange("age", opt[0] ?? "")}
									required
								/>
							</GridItem>

							<GridItem colSpan={{ base: 6, sm: 4 }}>
								<TextInput
									label="What is your Discord username?"
									id="discord"
									placeholder="@username or username#1234"
									value={application.discord}
									onChange={(e) => handleChange("discord", e.target.value)}
									description="Discord will be our primary form of communication."
									required
								/>
							</GridItem>

							<GridItem colSpan={{ base: 6, sm: 3 }}>
								<Select
									label="Which country do you currently reside in?"
									options={countryNames}
									onChange={(opt) =>
										handleChange("countryOfResidence", opt[0] ?? "")
									}
									required
								/>
							</GridItem>

							<GridItem colSpan={{ base: 6, sm: 3 }}>
								<TextInput
									label="Which city do you live in?"
									value={application.city}
									onChange={(e) => handleChange("city", e.target.value)}
									required
								/>
							</GridItem>

							<GridItem colSpan={6}>
								<PhoneInput required onChange={handlePhoneChange} />
							</GridItem>

							<GridItem colSpan={{ base: 6, sm: 3 }}>
								<Select
									label="Which school are you currently attending?"
									options={schools}
									onChange={(opt) => handleChange("school", opt[0] ?? "")}
									allowCustomValue
									required
								/>
								<p className="mt-2 text-sageGray">
									If you recently graduated, pick the school you graduated from.
								</p>
							</GridItem>

							<GridItem colSpan={{ base: 6, sm: 3 }}>
								<Select
									label="What is your current level of study?"
									options={levelsOfStudy}
									onChange={(opt) => handleChange("levelOfStudy", opt[0] ?? "")}
									required
								/>
							</GridItem>

							<GridItem colSpan={6}>
								<Select
									multiple
									label="What is your major/field of study?"
									options={majorsList}
									onChange={(opts) => handleChange("major", opts)}
									allowCustomValue
									required
								/>
							</GridItem>
						</SimpleGrid>
					)}
					{/* end of basic profile */}

					{/* hacker specific questions */}
					{activeStep === 1 && (
						<SimpleGrid
							marginX="auto"
							columns={6}
							display={activeStep !== 1 ? "hidden" : "grid"}
							gapX="1.5rem"
							gapY="2rem"
						>
							<GridItem colSpan={6}>
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
							</GridItem>
							<GridItem colSpan={6}>
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
							</GridItem>
						</SimpleGrid>
					)}
					{/* end of hacker specific questions */}

					{/* general questions */}
					{activeStep === 2 && (
						<SimpleGrid
							marginX="auto"
							columns={6}
							display={activeStep !== 2 ? "hidden" : "grid"}
							gapX="1.5rem"
							gapY="2rem"
						>
							<GridItem colSpan={6}>
								<Select
									label="What gender do you identify as?"
									options={genders}
									allowCustomValue={true}
									required={true}
									onChange={(opt) => handleChange("gender", opt[0] ?? "")}
								/>
							</GridItem>

							<GridItem colSpan={6}>
								<Select
									label="What are your pronouns?"
									options={pronouns}
									allowCustomValue={true}
									required={true}
									onChange={(opts) => handleChange("pronouns", opts)}
								/>
							</GridItem>

							<GridItem colSpan={6}>
								<Select
									label="Please select any of the following that resonates with you:"
									options={sexualityList}
									allowCustomValue={true}
									required={true}
									onChange={(opt) => handleChange("sexuality", opt[0] ?? "")}
								/>
							</GridItem>

							<GridItem colSpan={6}>
								<Select
									label="Which of the following best describes your racial or ethnic background?"
									options={races}
									allowCustomValue={false}
									required={true}
									onChange={(opt) => handleChange("race", opt[0] ?? "")}
								/>
							</GridItem>

							<GridItem colSpan={6}>
								<Select
									multiple
									label="Do you have any dietary restrictions?"
									options={diets}
									allowCustomValue={true}
									required={true}
									onChange={(opts) => handleChange("diets", opts)}
								/>
							</GridItem>

							<GridItem colSpan={6}>
								<Select
									multiple
									label="Are there any allergens you have that we should be aware of?"
									options={allergies}
									allowCustomValue={true}
									required={true}
									onChange={(opts) => handleChange("allergies", opts)}
								/>
							</GridItem>

							<GridItem colSpan={6}>
								<Select
									multiple
									label="Which of the following fields interests you?"
									options={interests}
									allowCustomValue={true}
									required={true}
									onChange={(opts) => handleChange("interests", opts)}
								/>
							</GridItem>

							<GridItem colSpan={6}>
								<Select
									label="How many Hackathons have you attended as a participant in the past?"
									options={hackathonExps}
									required={true}
									onChange={(opt) =>
										handleChange("hackathonExperience", opt[0] ?? "")
									}
								/>
							</GridItem>

							<GridItem colSpan={6}>
								<Select
									multiple
									label="What programming languages are you the most comfortable with or passionate about?"
									options={programmingLanguages}
									allowCustomValue={true}
									onChange={(opts) =>
										handleChange("programmingLanguages", opts)
									}
								/>
							</GridItem>
						</SimpleGrid>
					)}
					{/* end of general questions */}

					{/* final steps - agreements */}
					{activeStep === 3 && (
						<SimpleGrid
							marginX="auto"
							columns={6}
							display={activeStep !== 3 ? "hidden" : "grid"}
							gapX="1.5rem"
							gapY="2rem"
						>
							<GridItem colSpan={6}>
								<Text fontWeight="medium" color="gray.400">
									If you would like to share your resume with our sponsors,
									please do so now.
								</Text>
								<Text fontSize="sm" fontStyle="italic">
									Sponsors will be conducting coffee chats/interviews during the
									hackathon, or might reach out via email for career or job
									opportunities.
								</Text>
								<FileBrowser
									label="Resume"
									inputId="sponsors-resume-file-input"
									accept={[
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
										file && setGeneralResumeFile(file[0] ?? null);
									}}
								/>
							</GridItem>
							<GridItem colSpan={6}>
								<Select
									multiple
									label="How did you hear about us?"
									options={referralSources}
									onChange={(opts) => handleChange("referralSources", opts)}
									allowCustomValue
									required
								/>
							</GridItem>
							<GridItem colSpan={6}>
								<TextInput
									label="How would you describe the taste of salt to someone who hasn't tasted it, and can't ever taste it?"
									id="funsie-1"
									onChange={(e) => handleChange("describeSalt", e.target.value)}
									required
									value={application.describeSalt}
								/>
							</GridItem>
							<GridItem colSpan={6} spaceY="1rem">
								<Field.Root required>
									<Checkbox.Root
										checked={application.agreedToMLHCoC}
										onCheckedChange={(e) =>
											handleChange(
												"agreedToMLHCoC",
												typeof e.checked === "boolean" && e.checked,
											)
										}
									>
										<Checkbox.HiddenInput />
										<Checkbox.Control />
										<Checkbox.Label>
											I have read and agree to the{" "}
											<ChakraLink
												color="skyblue"
												textDecor="underline"
												href="https://static.mlh.io/docs/mlh-code-of-conduct.pdf"
											>
												MLH Code of Conduct
											</ChakraLink>
											.
											<Field.RequiredIndicator />
										</Checkbox.Label>
									</Checkbox.Root>
								</Field.Root>
								<Field.Root required>
									<Checkbox.Root
										checked={application.agreedToMLHToCAndPrivacyPolicy}
										onCheckedChange={(e) =>
											handleChange(
												"agreedToMLHToCAndPrivacyPolicy",
												typeof e.checked === "boolean" && e.checked,
											)
										}
									>
										<Checkbox.HiddenInput />
										<Checkbox.Control />
										<Checkbox.Label>
											<Text>
												I authorize you to share my application/registration
												information with Major League Hacking for event
												administration, ranking, and MLH administration in-line
												with the{" "}
												<ChakraLink
													color="skyblue"
													textDecor="underline"
													href="https://github.com/MLH/mlh-policies/blob/main/privacy-policy.md"
												>
													MLH Privacy Policy
												</ChakraLink>
												. I further agree to the terms of both the{" "}
												<ChakraLink
													color="skyblue"
													textDecor="underline"
													href="https://github.com/MLH/mlh-policies/blob/main/contest-terms.md"
												>
													MLH Contest Terms and Conditions{" "}
												</ChakraLink>{" "}
												and the{" "}
												<ChakraLink
													color="skyblue"
													textDecor="underline"
													href="https://github.com/MLH/mlh-policies/blob/main/privacy-policy.md"
												>
													MLH Privacy Policy
												</ChakraLink>
												.
												<Field.RequiredIndicator />
											</Text>
										</Checkbox.Label>
									</Checkbox.Root>
								</Field.Root>
								<Field.Root>
									<Checkbox.Root
										checked={application.agreedToReceiveEmailsFromMLH}
										onCheckedChange={(e) =>
											handleChange(
												"agreedToReceiveEmailsFromMLH",
												typeof e.checked === "boolean" && e.checked,
											)
										}
									>
										<Checkbox.HiddenInput />
										<Checkbox.Control />
										<Checkbox.Label>
											<Text>
												I authorize MLH to send me occasional emails about
												relevant events, career opportunities, and community
												announcements.
											</Text>
										</Checkbox.Label>
									</Checkbox.Root>
								</Field.Root>
							</GridItem>
						</SimpleGrid>
					)}
					{/* end of final steps - agreements */}

					{/* adding some more white space between the last input field and the buttons */}
					<Box height="3rem" />

					{/* just a separator line */}
					<Box height="0.125rem" marginY="1.5rem" bg="#1F1E2E" />

					<div>
						{errors.length > 0 ? (
							<Text textAlign="center" color="red">
								Oh no! It appears that the are errors in the form.
							</Text>
						) : null}
					</div>

					<Flex
						alignItems="center"
						justifyContent="space-between"
						paddingX={{ base: "1rem", sm: "2rem" }}
						paddingY="1rem"
					>
						<Box spaceX="1rem">
							<Button
								disabled={activeStep === 0 || isSubmitting}
								onClick={prevStep}
								type="button"
							>
								Back
							</Button>
							<Button
								variant="outline"
								_hover={{
									bg: "brand.subtle/10",
								}}
								color="brand.subtle"
								onClick={() => navigate(paths.home)}
								type="button"
							>
								Cancel
							</Button>
						</Box>
						<Button
							color="black"
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
					</Flex>
				</form>
			</div>
		</PageWrapper>
	);
};
