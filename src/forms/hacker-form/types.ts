import type { Timestamp } from "firebase/firestore";

export interface ApplicationData {
	firstName: string;
	lastName: string;
	phone: string;
	school: string;
	levelOfStudy: string;
	countryOfResidence: string;
	city: string;
	age: string;
	discord: string;
	major: string[];
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
	email: string;
	hackathonYear?: string;
	rsvp?: boolean;
	applicationStatus?: "pending" | "rejected" | "accepted";
}

export type ApplicationDataKey = keyof ApplicationData;
