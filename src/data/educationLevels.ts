export const educationLevels = [
	"Middle school / high school / Secondary school",
	"College (2 or 3-year program)",
	"Undergraduate-level University (3 to 5-year program)",
	"Graduate-level University",
	"Postgraduate-level University (i.e, Doctorate/Phd)",
	"Post Doctorate",
	"Other",
	"I recently graduated",
	"Prefer not to answer",
] as const;

// Create a type from the array values
export type EducationLevel = (typeof educationLevels)[number];

// Define yearOfStudies only for the specified education levels
export const yearOfStudies: Partial<Record<EducationLevel, string[]>> = {
	"Middle school / high school / Secondary school": [
		"Grade 7",
		"Grade 8",
		"Grade 9",
		"Grade 10",
		"Grade 11",
		"Grade 12",
		"Grade 13",
	],
	"College (2 or 3-year program)": ["Year 1", "Year 2", "Year 3"],
	"Undergraduate-level University (3 to 5-year program)": [
		"Year 1",
		"Year 2",
		"Year 3",
		"Year 4",
		"Year 5",
	],
};
