import type { ApplicationData } from "@/forms/hacker-form/types";
import { Timestamp } from "firebase/firestore";

export const defaultApplication: ApplicationData = {
	firstName: "",
	lastName: "",
	phone: {
		country: "",
		number: "",
	},
	school: "",
	//@ts-ignore
	educationLevels: "",
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

	businessTech: "",
	experienceResonates: [],
	interestedOpportunities: [],

	email: "",

	hackathonYear: "2025", // maybe there is a better way to define this
	rsvp: false,
	timestamp: Timestamp.now(),
	applicationStatus: "draft",
};
