import type { ApplicationData } from "@/forms/hacker-form/types";

export const defaultApplication: ApplicationData = {
	firstName: "",
	lastName: "",
	phone: "",
	school: "",
	educationLevels: "Prefer not to answer",
	age: "",
	discord: "",
	countryOfResidence: "",
	city: "",
	travel: "",
	major: [],

	gender: "",
	pronouns: [],
	sexuality: "",
	race: "",
	diets: [],
	allergies: [],
	interests: [],
	hackathonExperience: "",
	programmingLanguages: [],
	participatingAs: "Hacker",
	applicantId: "",
	agreedToSpurHacksCoc: false,
	agreedToMLHCoC: false,
	agreedToMLHToCAndPrivacyPolicy: false,
	agreedToReceiveEmailsFromMLH: false,
	referralSources: [],
	describeSalt: "",
	generalResumeRef: "",

	participateInHawkHacks: false,
	agreedToReceiveEmailsFromKonferOrSpur: false,

	reasonToBeInSpurHacks: "",
	revolutionizingTechnology: "",

	email: "",

	hackathonYear: "2025", // maybe there is a better way to define this
	rsvp: false,
};
