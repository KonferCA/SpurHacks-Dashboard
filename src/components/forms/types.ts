import type {
	MultiSelectProps,
	SelectProps,
	TextInputProps,
} from "@/components/types";
import type { Timestamp } from "firebase/firestore";
import type { TextAreaProps } from "../TextArea/TextArea";

export interface HackerApplicationReadOnlyData {
	hackathonYear?: string;
	rsvp?: boolean;
	applicationStatus?: "pending" | "rejected" | "accepted";
}

export interface HackerApplicationData {
	firstName: string;
	lastName: string;
	phone: string;
	school: string;
	levelOfStudy: string;
	countryOfResidence: string;
	city: string;
	age: string;
	discord: string;
	instagram: string;
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
	participatingAs: "Hacker" | "Mentor" | "Volunteer";
	applicantId: string;
	agreedToHawkHacksCoC: boolean;
	agreedToWLUCoC: boolean;
	agreedToMLHCoC: boolean;
	agreedToMLHToCAndPrivacyPolicy: boolean;
	agreedToReceiveEmailsFromMLH: boolean;
	referralSources: string[];
	describeSalt: string;
	generalResumeRef: string;
	timestamp?: Timestamp;
	email: string;

	// This field is added later from another document that the applicant don't have
	// access to update the information since it is crucial to accurately render the interface
	// and grant access to certain pages and actions.
	readOnly?: HackerApplicationReadOnlyData;
}

export interface HackerSpecificAppData {
	reasonToBeInHawkHacks: string;
	revolutionizingTechnology: string;
}

export type ApplicationData = HackerApplicationData & HackerSpecificAppData;

export type ApplicationInputKeys = keyof ApplicationData;

export interface TextFormInput {
	type: "text";
	props: TextInputProps;
	name: ApplicationInputKeys;
}

export interface TextAreaFormInput {
	type: "textarea";
	props: TextAreaProps;
	name: ApplicationInputKeys;
}

export interface SelectFormInput {
	type: "select";
	props: SelectProps;
	name: ApplicationInputKeys;
}

export interface MultiSelectFormInput {
	type: "multiselect";
	props: MultiSelectProps;
	name: ApplicationInputKeys;
}

export type FormInput =
	| TextFormInput
	| SelectFormInput
	| MultiSelectFormInput
	| TextAreaFormInput;
