export const experienceResonatesOptions = [
	"I want the classic hackathon experience: build something from scratch and compete for prizes.",
	"I want a hybrid hackathon and pitch experience: build from scratch, do market research, and pitch for prizes or potential investment.",
	"I already have a project (prototype or concept) and would like to pitch it for investment.",
	"I already have a project with a working product, but I need help on the business side, then pitch for investment.",
	"I already have a project with the business side covered and want the chance to pitch for funding.",
] as const;

export type ExperienceResonateOption =
	(typeof experienceResonatesOptions)[number];

export const interestedOppOptions = [
	"business side covered, pitch for investment",
	"tech covered, pitch for investment",
] as const;
