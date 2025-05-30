import type { Timestamp } from "firebase-admin/firestore";

export type Context =
	| {
			auth?: {
				uid: string;
				token?: {
					admin?: boolean;
					email?: string;
				};
			};
	  }
	| undefined;

export interface ApplicationData {
	// Basic information
	firstName: string;
	lastName: string;
	age: string;
	phone: {
		country: string; // formatted country-name (+code)
		number: string; // formatted xxx-yyy-zzzz
	};
	email: string; // this field is disabled and auto popullated
	educationLevels: string;
	// this is conditional, only required when educationLevels is middle,high,secondary school, college, or univerity
	yearOfStudies: string;
	school: string;
	major: string[];
	countryOfResidence: string;
	city: string;
	travel: string;
	discord: string;

	// Interests
	interests: string[];
	businessTech: string;
	// Q: Which of these experiences resonates with you? (Select all that apply)
	experienceResonates: string[];
	// Q: What opportunities would you be interested in?
	interestedOpportunities: string[];
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
	timestamp: Timestamp;
	hackathonYear: string;
	rsvp: boolean;
	applicationStatus: "draft" | "pending" | "rejected" | "accepted";
}
