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
	discord: string;

	gender: string;
	pronouns: string[];
	sexuality: string;
	race: string;
	diets: string[];
	allergies: string[];
	interests: string[];
	hackathonExperience: string;
	programmingLanguages: string[];
	participatingAs: "Hacker";
	applicantId: string;
	agreedToMLHCoC: boolean;
	agreedToMLHToCAndPrivacyPolicy: boolean;
	agreedToReceiveEmailsFromMLH: boolean;
	referralSources: string[];
	describeSalt: string;
	generalResumeRef: string;
	reasonToBeInHawkHacks: string;
	revolutionizingTechnology: string;
	timestamp?: Timestamp;
	hackathonYear?: string;
	rsvp?: boolean;
	applicationStatus?: "pending" | "rejected" | "accepted";
}

export type ApplicationDataKey = keyof ApplicationData;
