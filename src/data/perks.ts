import {
	Perks1Password,
	PerksBalsamiq,
	PerksCertopus,
	PerksEcho3D,
	PerksIncogni,
	PerksNordVPN,
	PerksRosenfield,
	PerksTaskade,
	PerksWolfram,
	PerksDeFiBlocks,
} from "@/assets";

export interface PerksData {
	image: string;
	title: string;
	description: string;
	alt: string;
	actions?: {
		link: string;
		title: string;
	}[];
}

const perksData: PerksData[] = [
	{
		image: PerksNordVPN,
		title: "NordVPN & NordPass",
		description:
			"🔐 Get NordVPN with a whopping 68% discount PLUS enjoy NordPass and NordLocker for all participants!",
		alt: "NordVPN & NordPass",
		actions: [
			{
				link: "https://nordvpn.com/hackathons/?utm_medium=affiliate&utm_term=&utm_content&utm_campaign=hawkhacks24",
				title: "Redeem Now",
			},
		],
	},
	{
		image: PerksIncogni,
		title: "Incogni",
		description:
			"🛡 Delete your personal data from the internet with Incogni! Incogni is providing all participants with a 50% coupon to all participants!",
		alt: "Incogni",
		actions: [
			{
				link: "https://incogni.com/?utm_medium=affiliate&utm_term=&utm_content&utm_campaign=hawkhacks24",
				title: "Redeem Now",
			},
		],
	},
	{
		image: PerksDeFiBlocks,
		title: "DeFi Blocks",
		description: "Come back soon to see what they’re giving away!",
		alt: "DeFi Blocks",
	},
	{
		image: Perks1Password,
		title: "1Password",
		description:
			"We're proud to offer 1 year free of 1Password Families to all participants who are new users!",
		alt: "1Password",
		actions: [
			{
				link: "https://start.1password.com/signup/plan?c=HACK-TG35J694",
				title: "Redeem Now",
			},
		],
	},
	{
		image: PerksWolfram,
		title: "Wolfram",
		description:
			"Access to Wolfram | Reedemable for the first 500 users who sign up! Wolfram | One includes both Desktop and Cloud access, full access to the Wolfram Language, 5000 Wolfram | Alpha API calls and more!",
		alt: "Wolfram",
		actions: [
			{
				link: "https://account.wolfram.com/redeem/zHawkHacks424",
				title: "Redeem Now",
			},
		],
	},
	{
		image: PerksTaskade,
		title: "Taskade",
		description:
			"Taskade is giving all hackers promo codes for 20% off their starter tier and a lifetime discount! Once you sign up for free, email Taskade directly with your username, email, and the exact event details to redeem.",
		alt: "Taskade",
		actions: [
			{
				link: "https://www.taskade.com/?utm_medium=affiliate&utm_term=&utm_content&utm_campaign=hawkhacks24",
				title: "Redeem Now",
			},
		],
	},
	{
		image: PerksBalsamiq,
		title: "Balsamiq",
		description:
			"Balsamiq is providing all HawkHack attendees with a 60-day extended trial of Balsamiq Cloud - their effortless wireframing tool valued by product managers, founders, developers, & UX teams. Make sure to use code “BQHACK60” after creating an account!",
		alt: "Balsamiq",
		actions: [
			{
				link: "https://balsamiq.com/?utm_medium=affiliate&utm_term=&utm_content&utm_campaign=hawkhacks24",
				title: "Redeem Now",
			},
		],
	},
	{
		image: PerksEcho3D,
		title: "Echo3D",
		description:
			"Echo3D is giving all hackers a 1-month Pro-Tier subscription to Echo3D to all HawkHacks participants. Tech support will be available via Discord during the weekend.",
		alt: "Echo3D",
		actions: [
			{
				link: "https://console.echo3d.com/#/auth/register-promo?code=April2024echo944",
				title: "Redeem Now",
			},
		],
	},
	{
		image: PerksRosenfield,
		title: "Rosenfeld",
		description:
			"Rosenfeld will give 20% discount promos when checking out using the provided link for all participants.",
		alt: "Rosenfeld",
		actions: [
			{
				link: "https://rosenfeldmedia.com/hawkhacks",
				title: "Shop Now",
			},
		],
	},
	{
		image: PerksCertopus,
		title: "Certopus",
		description: "Come back soon to see what they’re giving away!",
		alt: "Certopus",
	},
];

export { perksData };
