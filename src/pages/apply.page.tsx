import { FileBrowser } from "@/components/FileBrowse/FileBrowse";
import { PhoneInput } from "@/components/PhoneInput/PhoneInput";
import { Steps } from "@/components/Steps";
import { TextArea } from "@/components/TextArea/TextArea";
import { toaster } from "@/components/ui/toaster";
import {
	ages,
	allergies,
	countryNames,
	diets,
	educationLevels,
	genders,
	hackathonExps,
	interests,
	majorsList,
	programmingLanguages,
	pronouns,
	races,
	referralSources,
	schools,
	sexualityList,
} from "@/data";
import { businessTechs } from "@/data/businessTechs";
import { countryCodes } from "@/data/countryPhoneCodes";
import { yearOfStudies } from "@/data/educationLevels";
import {
	experienceResonatesOptions,
	interestedOppOptions,
} from "@/data/experienceResonatesOptions";
import { travelOptions } from "@/data/travel";
import { defaultApplication } from "@/forms/hacker-form/defaults";
import type {
	ApplicationData,
	ApplicationDataKey,
} from "@/forms/hacker-form/types";
import { validations } from "@/forms/hacker-form/validations";
import { useApplications } from "@/hooks/use-applications";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/providers";
import { paths } from "@/providers/RoutesProvider/data";
import {
	DuplicateApplicationError,
	saveApplicationDraft,
	submitApplication,
} from "@/services/firebase/application";
import {
	deleteGeneralResume,
	uploadGeneralResume,
} from "@/services/firebase/files";
import { ApplicationDataDoc } from "@/services/firebase/types";
import {
	Box,
	Button,
	Card,
	Link as ChakraLink,
	Checkbox,
	Field,
	Fieldset,
	Flex,
	GridItem,
	SimpleGrid,
	Text,
} from "@chakra-ui/react";
import { LoadingAnimation, PageWrapper, Select, TextInput } from "@components";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Navigate, useNavigate } from "react-router-dom";

enum StepsEnum {
	BasicInformation,
	Interests,
	Motivation,
	Demographics,
	FinalTouches,
}

function isStep(current: number, expected: StepsEnum) {
	return current === expected;
}

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
const condOptions = [
	experienceResonatesOptions[2],
	experienceResonatesOptions[3],
	experienceResonatesOptions[4],
];

// Define fields to validate for each step
const stepFields: ApplicationDataKey[][] = [
	// Step 0: Basic Information
	[
		"firstName",
		"lastName",
		"age",
		"phone",
		"email",
		"educationLevels",
		"yearOfStudies",
		"school",
		"major",
		"countryOfResidence",
		"city",
		"travel",
		"discord",
	],

	// Step: Interests
	[
		"interests",
		"hackathonExperience",
		"programmingLanguages",
		"businessTech",
		"experienceResonates",
		"interestedOpportunities",
	],

	// Step: Motivation
	["reasonToBeInSpurHacks", "revolutionizingTechnology"],

	// Step: Demographics
	["diets", "allergies", "gender", "pronouns", "sexuality", "race"],

	// Step: Final checks
	[
		"referralSources",
		"describeSalt",
		"agreedToMLHCoC",
		"agreedToMLHToCAndPrivacyPolicy",
		"agreedToSpurHacksCoc",
	],
];

type FormErrors = { _hasErrors: boolean } & Partial<
	Record<ApplicationDataKey, string>
>;

const steps = [
	{ position: StepsEnum.BasicInformation, name: "Basic Information" },
	{ position: StepsEnum.Interests, name: "Interests" },
	{ position: StepsEnum.Motivation, name: "Motivation" },
	{ position: StepsEnum.Demographics, name: "Demographics" },
	{ position: StepsEnum.FinalTouches, name: "Final Touches" },
];

export const ApplyPage = () => {
	const [activeStep, setActiveStep] = useState(StepsEnum.BasicInformation); // index
	const [errors, setErrors] = useState<FormErrors>({ _hasErrors: false });
	const { currentUser } = useAuth();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoadingResume, setIsLoadingResume] = useState(false);
	const {
		isLoading: loadingApplications,
		drafts,
		refreshApplications,
		refreshDrafts,
	} = useApplications();
	const navigate = useNavigate();

	if (!currentUser) return <Navigate to={paths.login} />;

	// we start with the default user profile
	const [application, setApplication] = useState<ApplicationData>(() => {
		const app: ApplicationData = {
			...defaultApplication,
			email: currentUser.email ?? "",
		};
		return app;
	});

	const draftId = useMemo(() => {
		if (drafts.length) return drafts[0].__docId;
		return undefined;
	}, [drafts]);

	useEffect(() => {
		if (drafts.length) {
			setApplication({ ...drafts[0] });
		}
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
				if (name === "educationLevels") {
					// reset this value if the education level changes
					updatedApp.yearOfStudies = "";
				}
				autosave(updatedApp, currentUser.uid, draftId);
				return updatedApp;
			});

			// Clear errors
			clearErrors();
		},
		[],
	);

	const clearErrors = () => setErrors({ _hasErrors: false });

	const validateField = <K extends ApplicationDataKey>(field: K) => {
		if (field === "yearOfStudies") {
			// Only validate yearOfStudies if the education level requires it
			const requiresYearOfStudy =
				yearOfStudies[application.educationLevels] !== undefined;
			if (requiresYearOfStudy && validations[field]) {
				return validations[field](application[field]);
			}
			return null;
		}

		if (field === "interestedOpportunities") {
			let requires = false;
			for (const opt of condOptions) {
				requires = application.experienceResonates.includes(opt);
				if (requires) break;
			}
			if (requires && validations[field]) {
				return validations[field](application[field]);
			}
			return null;
		}

		if (validations[field]) {
			return validations[field](application[field]);
		}
		return null;
	};

	const validateCurrentStep = () => {
		clearErrors();

		const fieldsToValidate = stepFields[activeStep];
		const stepErrors: FormErrors = { _hasErrors: false };

		for (const field of fieldsToValidate) {
			const error = validateField(field);
			if (error) {
				stepErrors._hasErrors = true;
				stepErrors[field] = error;
			}
		}

		if (stepErrors._hasErrors) {
			setErrors(stepErrors);
			return false;
		}

		return true;
	};

	const nextStep = () => {
		if (activeStep < steps.length) {
			// Validate current step before proceeding
			if (!validateCurrentStep()) return;
			setActiveStep((s) => s + 1);
			setTimeout(() => {
				window.scrollTo({ top: 0, behavior: "smooth" });
			}, 100);
		}
	};

	const prevStep = () => {
		if (activeStep > 0) {
			setActiveStep((s) => s - 1);
			setTimeout(() => {
				window.scrollTo({ top: 0, behavior: "smooth" });
			}, 100);
		}
	};

	const submitApp = async (e?: FormEvent) => {
		if (e) {
			e.preventDefault();
		}

		clearErrors();

		// If we're not on the final step, just validate the current step
		if (activeStep !== steps.length - 1) {
			nextStep();
			return;
		}

		// On the final step, validate the current step first
		if (!validateCurrentStep()) return;

		setIsSubmitting(true);

		try {
			application.email = currentUser.email as string;
			await submitApplication(application, currentUser.uid);
			toaster.success({
				title: "Application Submitted!",
				description:
					"Thank you for applying! You'll hear from us via email within one week after applications close on June 6th.",
				duration: 5000,
			});
			await refreshApplications();
		} catch (e) {
			if (e instanceof DuplicateApplicationError) {
				toaster.error({
					title: "Duplicate Submission",
					description:
						"We got your previous submission. You'll hear from us early June.",
				});
			} else {
				toaster.error({
					title: "Error Submitting Application",
					description: "Please retry later.",
				});
			}
			console.error(e);
		} finally {
			// navigate to post submission page
			navigate(paths.home);
		}
	};

	const fillWithSampleData = useCallback(() => {
		setApplication((currentApplication) => {
			const updated = {
				...currentApplication,
				firstName: "Jon",
				lastName: "Snow",
				age: "18",
				phone: {
					country: countryCodes[0],
					number: "111-222-3333",
				},
				educationLevels: "Undergraduate-level University (3 to 5-year program)",
				yearOfStudies: "Year 1",
				school: "Wilfird Laurier Univeristy",
				major: ["Computer Science", "Data Science"],
				countryOfResidence: "Canada",
				city: "Waterloo",
				travel: "No, I live in Kitchener-Waterloo",
				discord: "mydiscord",
				businessTech:
					"Interested in case and pitch competitions (business-oriented student)",
				experienceResonates: [
					"I want the classic hackathon experience: build something from scratch and compete for prizes.",
				],
				interestedOpportunities: [],
				interests: [
					"Web3, Crypto, and Blockchain",
					"Quantum Computing",
					"Artificial Intelligence (AI)",
					"Robotics",
				],
				hackathonExperience:
					"I've only been to a single hackathon before this.",
				programmingLanguages: ["C", "Go", "C++"],
				reasonToBeInSpurHacks: "Cuz its dope",
				revolutionizingTechnology: "Pipeline",
				diets: ["None"],
				allergies: ["Hellipcoters"], // this is for testing custom entries
				gender: "KKKKKKK",
				pronouns: [], // test optional entry
				sexuality: "",
				race: "Asian",
				referralSources: [
					"Sponsor's or partner's social media accounts",
					"Word of mouth",
					"Physical poster or advertisement in Toronto",
					"Physical poster or advertisement in Kitchener-Waterloo",
					"Advertisement from a professor or class",
					"Advertisements from another Discord server",
				],
				describeSalt: "Salty",
				agreedToMLHCoC: true,
				agreedToMLHToCAndPrivacyPolicy: true,
				agreedToReceiveEmailsFromKonferOrSpur: true,
				agreedToReceiveEmailsFromMLH: true,
				agreedToSpurHacksCoc: true,
				participateInHawkHacks: false,
			} satisfies ApplicationData;

			autosave(updated, currentUser.uid, draftId);

			return updated;
		});
	}, [currentUser, draftId]);

	const getStepTitle = useCallback(
		(step: number) => steps[step]?.name ?? "",
		[],
	);

	if (loadingApplications)
		return (
			<PageWrapper>
				<LoadingAnimation />
			</PageWrapper>
		);

	return (
		<PageWrapper>
			<div>
				{(import.meta.env.DEV || import.meta.env.MODE === "staging") && (
					<Card.Root my="1rem">
						<Card.Body spaceY="1rem">
							<Text>
								This button is only visible during development or staging.
							</Text>
							<Button onClick={fillWithSampleData}>
								Fill with sample data
							</Button>
						</Card.Body>
					</Card.Root>
				)}
				<Box
					as="nav"
					aria-label="Application progress"
					marginBottom="2rem"
					paddingX={{ base: "1rem", md: "1.5rem" }}
				>
					<Steps
						step={activeStep}
						count={steps.length}
						onGetStepTitle={getStepTitle}
					/>
				</Box>
				<Box
					maxWidth={{
						base: "full",
						md: "xl",
						lg: "3xl",
					}}
					margin="auto"
				>
					<form>
						{/* basic information */}
						{isStep(activeStep, StepsEnum.BasicInformation) && (
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
										error={errors["firstName"]}
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
										error={errors["lastName"]}
										required
									/>
								</GridItem>

								<GridItem colSpan={{ base: 6, sm: 2 }}>
									<Select
										value={mapOption(application.age)}
										label="How old are you?"
										placeholder="Select age"
										options={ages}
										onChange={(opt) => handleChange("age", opt[0] ?? "")}
										error={errors["age"]}
										required
									/>
								</GridItem>

								<GridItem colSpan={{ base: 6, sm: 4 }}>
									<TextInput
										label="What email can we use to contact you with?"
										type="email"
										defaultValue={application.email}
										description="The email can't be changed. If this is not the correct email, please create a new account with the desire email."
										disabled
										required
									/>
								</GridItem>

								<GridItem colSpan={6}>
									<PhoneInput
										required
										value={application.phone}
										onChange={(v) => handleChange("phone", v)}
										error={errors.phone}
									/>
								</GridItem>

								<GridItem colSpan={6}>
									<Select
										value={mapOption(application.educationLevels)}
										label="What is your current education level?"
										placeholder="Select education level"
										options={educationLevels}
										onChange={(opt) =>
											// @ts-ignore
											handleChange("educationLevels", opt[0] ?? "")
										}
										error={errors.educationLevels}
										required
									/>
								</GridItem>

								{yearOfStudies[application.educationLevels] && (
									<GridItem colSpan={6}>
										<Select
											value={mapOption(application.yearOfStudies)}
											label={`What is the year of ${application.educationLevels} are you in?`}
											placeholder="Select year"
											options={
												yearOfStudies[application.educationLevels] as string[]
											}
											onChange={(opt) =>
												handleChange("yearOfStudies", opt[0] ?? "")
											}
											error={errors.yearOfStudies}
											required
										/>
									</GridItem>
								)}

								<GridItem colSpan={6}>
									<Select
										value={mapOption(application.school)}
										label="Which school are you currently attending?"
										placeholder="Select school"
										options={schools}
										onChange={(opt) => handleChange("school", opt[0] ?? "")}
										allowCustomValue
										error={errors.school}
										description="If you recently graduated, pick the school you graduated from."
										required
									/>
								</GridItem>

								<GridItem colSpan={6}>
									<Select
										value={mapOption(application.major)}
										label="What is your major/field of study?"
										placeholder="Select major/field of study"
										options={majorsList}
										onChange={(opts) => handleChange("major", opts)}
										error={errors.major}
										multiple
										required
										allowCustomValue
									/>
								</GridItem>

								<GridItem colSpan={{ base: 6, sm: 3 }}>
									<Select
										value={mapOption(application.countryOfResidence)}
										label="Which country do you currently reside in?"
										placeholder="Select country"
										options={countryNames}
										onChange={(opt) =>
											handleChange("countryOfResidence", opt[0] ?? "")
										}
										error={errors.countryOfResidence}
										required
									/>
								</GridItem>

								<GridItem colSpan={{ base: 6, sm: 3 }}>
									<TextInput
										label="Which city do you live in?"
										placeholder="City name"
										value={application.city}
										onChange={(e) => handleChange("city", e.target.value)}
										error={errors.city}
										required
									/>
								</GridItem>

								<GridItem colSpan={6}>
									<Select
										value={mapOption(application.travel)}
										label="Will you be travelling from outside the Kitchener-Waterloo area?"
										placeholder="e.g., Kitchener/Waterloo, or outside of the city"
										options={travelOptions}
										onChange={(opt) => handleChange("travel", opt[0] ?? "")}
										description="For anyone coming from out of town, we’ll contact you with updates on how you can apply for a travel bursary. For people nearby, we’ll have shuttle buses running from within the City of Waterloo (The University of Waterloo and Wilfrid Laurier University) and from Toronto (Union Station)."
										error={errors.travel}
										required
									/>
								</GridItem>

								<GridItem colSpan={6}>
									<TextInput
										label="What is your Discord username?"
										id="discord"
										placeholder="username or username#1234"
										value={application.discord}
										onChange={(e) => handleChange("discord", e.target.value)}
										description="Discord will be our primary form of communication."
										error={errors["discord"]}
										required
									/>
								</GridItem>
							</SimpleGrid>
						)}
						{/* end of basic information */}

						{/* interests */}
						{isStep(activeStep, StepsEnum.Interests) && (
							<SimpleGrid marginX="auto" columns={6} gapX="1.5rem" gapY="2rem">
								<GridItem colSpan={6}>
									<Select
										value={mapOption(application.businessTech)}
										label="What part of the business-tech side do you align with more?"
										placeholder="Select business-tech"
										options={businessTechs}
										onChange={(opts) =>
											handleChange("businessTech", opts[0] ?? "")
										}
										error={errors.businessTech}
										required
									/>
								</GridItem>

								<GridItem colSpan={6}>
									<Select
										value={mapOption(application.experienceResonates)}
										label="Which of these experiences resonates with you? (Select all that apply)"
										placeholder="Select experiences"
										options={experienceResonatesOptions}
										onChange={(opts) =>
											handleChange("experienceResonates", opts)
										}
										error={errors.experienceResonates}
										multiple
										required
									/>
								</GridItem>

								{condOptions.some((opt) =>
									application.experienceResonates.includes(opt),
								) && (
									<GridItem colSpan={6}>
										<Select
											value={mapOption(application.interestedOpportunities)}
											label="What opportunities would you be interested in?"
											placeholder="Select opportunities"
											options={interestedOppOptions}
											onChange={(opts) =>
												handleChange("interestedOpportunities", opts)
											}
											error={errors.interestedOpportunities}
											multiple
											required
										/>
									</GridItem>
								)}

								<GridItem colSpan={6}>
									<Select
										value={mapOption(application.interests)}
										label="Which of the following fields interests you?"
										placeholder="Select interests"
										options={interests}
										onChange={(opts) => handleChange("interests", opts)}
										error={errors.interests}
										allowCustomValue
										required
										multiple
									/>
								</GridItem>

								<GridItem colSpan={6}>
									<Select
										value={mapOption(application.hackathonExperience)}
										label="How many Hackathons have you attended as a participant in the past?"
										placeholder="Select experience"
										options={hackathonExps}
										onChange={(opt) =>
											handleChange("hackathonExperience", opt[0] ?? "")
										}
										error={errors.hackathonExperience}
										required
									/>
								</GridItem>

								<GridItem colSpan={6}>
									<Select
										value={mapOption(application.programmingLanguages)}
										label="What programming languages are you the most comfortable with or passionate about?"
										placeholder="Select programming languages"
										options={programmingLanguages}
										allowCustomValue={true}
										onChange={(opts) =>
											handleChange("programmingLanguages", opts)
										}
										error={errors.programmingLanguages}
										multiple
										required
									/>
								</GridItem>
							</SimpleGrid>
						)}
						{/* end of interests */}

						{/* motivation */}
						{isStep(activeStep, StepsEnum.Motivation) && (
							<SimpleGrid marginX="auto" columns={6} gapX="1.5rem" gapY="2rem">
								<GridItem colSpan={6}>
									<TextArea
										label="Why do you want to participate at SpurHacks?"
										placeholder="Write your answer here..."
										rows={4}
										onChange={(e) =>
											handleChange("reasonToBeInSpurHacks", e.target.value)
										}
										value={application.reasonToBeInSpurHacks}
										error={errors.reasonToBeInSpurHacks}
										required
									/>
								</GridItem>
								<GridItem colSpan={6}>
									<TextArea
										label="In a few sentences, what up-and-coming or revolutionizing technology are you most excited about?"
										placeholder="Write your answer here..."
										rows={4}
										onChange={(e) =>
											handleChange("revolutionizingTechnology", e.target.value)
										}
										value={application.revolutionizingTechnology}
										error={errors.revolutionizingTechnology}
										required
									/>
								</GridItem>
							</SimpleGrid>
						)}
						{/* end of motivation */}

						{/* demographics */}
						{isStep(activeStep, StepsEnum.Demographics) && (
							<SimpleGrid marginX="auto" columns={6} gapX="1.5rem" gapY="2rem">
								<GridItem colSpan={6}>
									<Select
										value={mapOption(application.diets)}
										label="Do you have any dietary restrictions?"
										placeholder="Select dietary restrictions"
										description="Can't find your dietary preference? Add it to ensure we can accommodate you."
										options={diets}
										onChange={(opts) => handleChange("diets", opts)}
										error={errors.diets}
										allowCustomValue
										required
										multiple
									/>
								</GridItem>

								<GridItem colSpan={6}>
									<Select
										value={mapOption(application.allergies)}
										label="Are there any allergens you have that we should be aware of?"
										placeholder="Select allergens"
										description="Don't see your allergen listed? Please specify it so we can accommodate you."
										options={allergies}
										onChange={(opts) => handleChange("allergies", opts)}
										error={errors.allergies}
										multiple
										required
										allowCustomValue
									/>
								</GridItem>

								<GridItem colSpan={6}>
									<Select
										value={mapOption(application.gender)}
										label="Which gender do you identify as?"
										placeholder="Select gender"
										options={genders}
										onChange={(opt) => handleChange("gender", opt[0] ?? "")}
										error={errors.gender}
										allowCustomValue
									/>
								</GridItem>

								<GridItem colSpan={6}>
									<Select
										value={mapOption(application.pronouns)}
										label="What are your pronouns?"
										placeholder="Select pronouns"
										options={pronouns}
										onChange={(opts) => handleChange("pronouns", opts)}
										error={errors.pronouns}
										allowCustomValue
									/>
								</GridItem>

								<GridItem colSpan={6}>
									<Select
										value={mapOption(application.sexuality)}
										label="Please select any of the following that resonates with you:"
										placeholder="Select answer"
										options={sexualityList}
										onChange={(opt) => handleChange("sexuality", opt[0] ?? "")}
										error={errors.sexuality}
										allowCustomValue
									/>
								</GridItem>

								<GridItem colSpan={6}>
									<Select
										value={mapOption(application.race)}
										label="Which of the following best describes your racial or ethnic background?"
										placeholder="Select ethnic background"
										options={races}
										onChange={(opt) => handleChange("race", opt[0] ?? "")}
										error={errors.race}
									/>
								</GridItem>
							</SimpleGrid>
						)}
						{/* end of demographics */}

						{/* final steps - agreements */}
						{isStep(activeStep, StepsEnum.FinalTouches) && (
							<SimpleGrid marginX="auto" columns={6} gapX="1.5rem" gapY="2rem">
								<GridItem colSpan={6}>
									<Text fontWeight="medium" color="offwhite.primary">
										If you would like to share your resume with our sponsors,
										please do so now.
									</Text>
									<Text
										fontSize="sm"
										fontStyle="italic"
										color="offwhite.primary"
									>
										Sponsors will be conducting coffee chats/interviews during
										the hackathon, or might reach out via email for career or
										job opportunities.
									</Text>
									<FileBrowser
										label="Resume"
										maxFiles={1}
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
										disabled={isLoadingResume}
										loading={isLoadingResume}
										onChange={async (file) => {
											setIsLoadingResume(true);
											if (file && file[0]) {
												try {
													// Upload the file immediately when selected
													const resumeLink = await uploadGeneralResume(
														file[0],
														currentUser.uid,
													);
													// Set the resume link in the application data
													handleChange("generalResumeRef", resumeLink);
													toaster.success({
														title: "Resume uploaded",
														description:
															"Your resume has been uploaded successfully.",
													});
												} catch (err) {
													console.error(err);
													toaster.error({
														title: "Error uploading resume",
														description: "Please try again later.",
													});
													setErrors({
														_hasErrors: true,
														generalResumeRef: "Error uploading resume.",
													});
												}
											} else {
												try {
													if (!application.generalResumeRef) return;
													// Delete from bucket
													await deleteGeneralResume(
														application.generalResumeRef,
													);
													// Reset ref
													handleChange("generalResumeRef", "");
													toaster.create({
														title: "Resume deleted from database",
													});
												} catch (err) {
													console.error(err);
													toaster.error({
														title: "Error removing resume",
														description: "Please try again later.",
													});
													setErrors({
														_hasErrors: true,
														generalResumeRef: "Error removing resume.",
													});
												}
											}
											setIsLoadingResume(false);
										}}
										error={errors["generalResumeRef"]}
									/>
								</GridItem>
								<GridItem colSpan={6}>
									<Select
										value={mapOption(application.referralSources)}
										label="How did you hear about us?"
										placeholder="Select platform"
										options={referralSources}
										onChange={(opts) => handleChange("referralSources", opts)}
										allowCustomValue
										error={errors.referralSources}
										multiple
										required
									/>
								</GridItem>
								<GridItem colSpan={6}>
									<TextInput
										label="How would you describe the taste of salt to someone who hasn't tasted it, and can't ever taste it?"
										placeholder="Be creative!"
										onChange={(e) =>
											handleChange("describeSalt", e.target.value)
										}
										value={application.describeSalt}
										error={errors.describeSalt}
										required
									/>
								</GridItem>
								<GridItem colSpan={6} spaceY="1rem">
									<Fieldset.Root
										invalid={
											!!errors["agreedToMLHCoC"] ||
											!!errors["agreedToMLHToCAndPrivacyPolicy"] ||
											!!errors.agreedToSpurHacksCoc
										}
									>
										<Fieldset.ErrorText>
											Please check all required fields (marked with *) before
											continuing.
										</Fieldset.ErrorText>
										<Checkbox.Root
											checked={application.participateInHawkHacks}
											onCheckedChange={(e) =>
												handleChange(
													"participateInHawkHacks",
													typeof e.checked === "boolean" && e.checked,
												)
											}
										>
											<Checkbox.HiddenInput />
											<Checkbox.Control />
											<Checkbox.Label>
												Would you like to attend{" "}
												<ChakraLink
													color="skyblue"
													textDecor="underline"
													href="https://hawkhacks.ca"
													target="_blank"
													rel="noopener noreferrer"
												>
													HawkHacks 2025
												</ChakraLink>
												, hosted in Waterloo from July 25th - 27th?
											</Checkbox.Label>
										</Checkbox.Root>
										<Field.Root required>
											<Checkbox.Root
												checked={application.agreedToSpurHacksCoc}
												onCheckedChange={(e) =>
													handleChange(
														"agreedToSpurHacksCoc",
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
														href="#"
														target="_blank"
														rel="noopener noreferrer"
													>
														SpurHacks Code of Conduct
													</ChakraLink>
													.
													<Field.RequiredIndicator />
												</Checkbox.Label>
											</Checkbox.Root>
										</Field.Root>
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
														target="_blank"
														rel="noopener noreferrer"
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
														administration, ranking, and MLH administration
														in-line with the{" "}
														<ChakraLink
															color="skyblue"
															textDecor="underline"
															href="https://github.com/MLH/mlh-policies/blob/main/privacy-policy.md"
															target="_blank"
															rel="noopener noreferrer"
														>
															MLH Privacy Policy
														</ChakraLink>
														. I further agree to the terms of both the{" "}
														<ChakraLink
															color="skyblue"
															textDecor="underline"
															href="https://github.com/MLH/mlh-policies/blob/main/contest-terms.md"
															target="_blank"
															rel="noopener noreferrer"
														>
															MLH Contest Terms and Conditions{" "}
														</ChakraLink>{" "}
														and the{" "}
														<ChakraLink
															color="skyblue"
															textDecor="underline"
															href="https://github.com/MLH/mlh-policies/blob/main/privacy-policy.md"
															target="_blank"
															rel="noopener noreferrer"
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
										<Field.Root>
											<Checkbox.Root
												checked={
													application.agreedToReceiveEmailsFromKonferOrSpur
												}
												onCheckedChange={(e) =>
													handleChange(
														"agreedToReceiveEmailsFromKonferOrSpur",
														typeof e.checked === "boolean" && e.checked,
													)
												}
											>
												<Checkbox.HiddenInput />
												<Checkbox.Control />
												<Checkbox.Label>
													<Text>
														I authorize Konfer and SPUR to send me occasional
														emails about relevant events, career opportunities,
														and community announcements.
													</Text>
												</Checkbox.Label>
											</Checkbox.Root>
										</Field.Root>
									</Fieldset.Root>
								</GridItem>
							</SimpleGrid>
						)}
						{/* end of final steps - agreements */}

						{/* adding some more white space between the last input field and the buttons */}
						<Box height="3rem" />

						{/* just a separator line */}
						<Box height="0.125rem" marginY="1.5rem" bg="#1F1E2E" />

						<Flex
							alignItems="center"
							justifyContent="space-between"
							paddingX={{ base: "1rem", sm: "2rem" }}
							paddingY="1rem"
						>
							<Box spaceX="1rem">
								<Button
									color="black"
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
								onClick={submitApp}
								type="button"
								disabled={isSubmitting || isLoadingResume}
								// I mean.... why not? for funsies
								className={isSubmitting ? "animate-spin" : ""}
							>
								{isSubmitting
									? "Submitting..."
									: activeStep === steps.length - 1
										? "Submit"
										: "Next"}
							</Button>
						</Flex>
					</form>
				</Box>
			</div>
		</PageWrapper>
	);
};
