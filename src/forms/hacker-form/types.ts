import type { EducationLevel } from "@/data/educationLevels";
import type { Timestamp } from "firebase/firestore";

export interface ApplicationData {
	// Basic information
	firstName: string;
	lastName: string;
	age: string;
	phone: string;
	email: string; // this field is disabled and auto popullated
	educationLevels: EducationLevel;
	// this is conditional, only required when educationLevels is middle,high,secondary school, college, or univerity
	yearOfStudies?: string;
	school: string;
	major: string[];
	countryOfResidence: string;
	city: string;
	travel: string;
	discord: string;

	// Interests
	interests: string[];
	businessTech: string;
	hackathonExperience: string;
	programmingLanguages: string[];

	// Motivation
	reasonToBeInSpurHacks: string;
	revolutionizingTechnology: string;

	// Demographics
	gender: string;
	pronouns: string[];
	sexuality: string;
	race: string;
	diets: string[];
	allergies: string[];

	// Final Checks
	participateInHawkHacks: boolean;
	agreedToSpurHacksCoc: boolean;
	agreedToMLHCoC: boolean;
	agreedToMLHToCAndPrivacyPolicy: boolean;
	agreedToReceiveEmailsFromMLH: boolean;
	agreedToReceiveEmailsFromKonferOrSpur: boolean;
	referralSources: string[];
	describeSalt: string;
	generalResumeRef: string;

	// Extra metadata
	participatingAs: "Hacker";
	applicantId: string;
	timestamp?: Timestamp;
	hackathonYear?: string;
	rsvp?: boolean;
	applicationStatus?: "pending" | "rejected" | "accepted";
}

export type ApplicationDataKey = keyof ApplicationData;
