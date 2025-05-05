import { SafeParseReturnType, z } from "zod";
import type { ApplicationData } from "@/forms/hacker-form/types";
import { ages, countryNames, hackathonExps } from "@/data";
import { educationLevels } from "@/data/educationLevels";

function formatResult<T, R>({ success, error }: SafeParseReturnType<T, R>) {
	let errStr = "";
	if (!success && error) {
		errStr = error.errors.map((err) => err.message).join("");
		return errStr;
	}
	return null;
}

export const validations: {
	[K in keyof ApplicationData]: (value: ApplicationData[K]) => string | null;
} = {
	firstName: (v) =>
		formatResult(z.string().nonempty("First name is empty.").safeParse(v)),
	lastName: (v) =>
		formatResult(z.string().nonempty("Last name is empty.").safeParse(v)),
	countryOfResidence: (v) =>
		formatResult(
			z
				.enum(countryNames, { message: "Please select a valid country name" })
				.safeParse(v),
		),
	city: (v) =>
		formatResult(
			// Not using enum evaluation since custom values are allowed.
			z
				.string()
				.nonempty(
					"Please select the city you currently live in. If your ciry is not in the options, please type the city name in the input field.",
				)
				.safeParse(v),
		),
	travel: (v) =>
		formatResult(
			z
				.string()
				.nonempty("Please tell us where you're travelling from.")
				.safeParse(v),
		),
	phone: (v) =>
		formatResult(z.string().nonempty("Phone number is empty").safeParse(v)),
	school: (v) =>
		formatResult(z.string().nonempty("School is empty").safeParse(v)),
	educationLevels: (v) =>
		formatResult(
			z
				.enum(educationLevels, { message: "Level of study is empty." })
				.safeParse(v),
		),
	yearOfStudies: (v) =>
		formatResult(
			z.string().nonempty("Please select the year you're in.").safeParse(v),
		),
	age: (v) =>
		formatResult(
			z.enum(ages, { message: "Please provide your age." }).safeParse(v),
		),
	discord: (v) =>
		formatResult(
			z
				.string()
				.nonempty("Discord username is empty")
				.refine((val) => {
					if (!val.startsWith("@") && !/\#\d{4}$/.test(val)) {
						return false;
					}
					return true;
				}, "Invalid Discord username. Expected @username or username#1234.")
				.safeParse(v),
		),
	major: (v) =>
		formatResult(
			z
				.string()
				.array()
				.nonempty(
					"Please select a major. If your major is not in the options, please type the major in the input field.",
				)
				.safeParse(v),
		),

	gender: (v) =>
		formatResult(
			z
				.string()
				.optional()
				.transform((val) => val ?? "Prefer not to answer")
				.safeParse(v),
		),
	pronouns: (v) =>
		formatResult(z.string().array().optional().default([]).safeParse(v)),
	sexuality: (v) =>
		formatResult(
			z.string().optional().default("Prefer not to answer").safeParse(v),
		),
	race: (v) =>
		formatResult(
			z.string().optional().default("Prefer not to answer").safeParse(v),
		),
	diets: (v) =>
		formatResult(
			z
				.string()
				.array()
				.nonempty("Please select at least one dietry restriction or 'None'.")
				.safeParse(v),
		),
	allergies: (v) =>
		formatResult(
			z
				.string()
				.array()
				.nonempty("Please select at least one allergen or 'None'.")
				.safeParse(v),
		),
	interests: (v) =>
		formatResult(
			z
				.string()
				.array()
				.min(1, "Please choose at least one interest.")
				.safeParse(v),
		),
	hackathonExperience: (v) =>
		formatResult(
			z
				.enum(hackathonExps, {
					message: "Please choose the most relevant option.",
				})
				.safeParse(v),
		),
	programmingLanguages: (v) =>
		formatResult(z.string().array().default([]).safeParse(v)),
	participatingAs: (v) =>
		formatResult(
			z
				.literal("Hacker", { message: "Participant must be 'Hacker'." })
				.safeParse(v),
		),
	applicantId: (v) => formatResult(z.string().safeParse(v)),
	agreedToMLHCoC: (v) =>
		formatResult(
			z
				.literal(true, {
					message: "You must agree to the MLH Code of Conduct to participate.",
				})
				.safeParse(v),
		),
	agreedToMLHToCAndPrivacyPolicy: (v) =>
		formatResult(
			z
				.literal(true, {
					message:
						"You must agree to the MLH Terms and Conditions and Privacy Policy to participate.",
				})
				.safeParse(v),
		),
	agreedToReceiveEmailsFromMLH: (v) => formatResult(z.boolean().safeParse(v)),
	agreedToSpurHacksCoc: (v) =>
		formatResult(
			z
				.literal(true, {
					message:
						"You must agree to the SpurHacks Code of Conduct to participate.",
				})
				.safeParse(v),
		),
	reasonToBeInSpurHacks: (v) =>
		formatResult(
			z
				.string()
				.nonempty("Please tell us why you want to  particiapte at HawkHacks.")
				.safeParse(v),
		),
	revolutionizingTechnology: (v) =>
		formatResult(
			z
				.string()
				.nonempty("Please tell us about a new tech you are most excited about.")
				.safeParse(v),
		),
	referralSources: (v) =>
		formatResult(
			z
				.string()
				.array()
				.nonempty(
					"Please tell us how you heard about HawkHacks. If non of the options reflect your situation, please write your answer in the text input.",
				)
				.safeParse(v),
		),
	describeSalt: (v) =>
		formatResult(
			z
				.string()
				.nonempty("Please tell us how you would describe the taste of salt.")
				.safeParse(v),
		),

	// Optionals or auto filled
	email: () => null,
	generalResumeRef: () => null,
	participateInHawkHacks: () => null,
	agreedToReceiveEmailsFromKonferOrSpur: () => null,
} as const;
