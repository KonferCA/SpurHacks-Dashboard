import type { HeaderInfo } from "./types";
/**
 * Defines all application routes as URL paths
 * Used for consistent route references throughout the application
 */
export const paths = {
	admin: "/admin",
	adminViewTicket: "/admin/ticket/:ticketId",
	adminManageEvents: "/admin/manage",
	notFound: "*",
	login: "/login",
	root: "/",
	home: "/home",
	verifyEmail: "/verify-email",
	schedule: "/schedule",
	networking: "/networking",
	myTicket: "/my-ticket",
	apply: "/apply",
	application: "/application",
	submitted: "/submitted",
	verifyRSVP: "/verify-rsvp",
	myTeam: "/my-team",
	joinTeam: "/join-team",
	ticket: "/ticket/:ticketId",
	perks: "/perks",
	myAccount: "/my-account",
	scan: "/scan",
} as const;

/**
 * Page titles and subtitles for each route
 * Used for displaying consistent header information
 */
export const titles: Record<string, HeaderInfo> = {
	[paths.root]: {
		title: "Home",
		subTitle: "The dashboard for all your needs.",
	},
	[paths.home]: {
		title: "Home",
		subTitle: "The dashboard for all your needs.",
	},
	[paths.schedule]: {
		title: "Schedule",
		subTitle: "View the schedule for the weekend!",
	},
	[paths.networking]: {
		title: "Networking",
		subTitle: "A quick way to connect with new people at SpurHacks!",
	},
	[paths.apply]: {
		title: "Application",
		subTitle: "Apply to participate in the hackathon now!",
	},
	[paths.verifyEmail]: {
		title: "Verify Your Email",
		subTitle: "Please check your email inbox.",
	},
	[paths.verifyRSVP]: {
		title: "Verify Your RSVP",
		subTitle: "All checkboxes are required.",
	},
	[paths.myTicket]: {
		title: "My Ticket",
		subTitle:
			"This is your event ticket! Make sure to keep it somewhere safe—you’ll need it to check in, claim food, win prizes, and more.",
	},
	[paths.myTeam]: {
		title: "My Team",
		subTitle: "Create your dream team! Add, manage, and view your teammates.",
	},
	[paths.joinTeam]: {
		title: "Join Team",
		subTitle: "Awesome, it looks like you have found teammates!",
	},
	[paths.ticket]: {
		title: "View Ticket",
		subTitle: "Some good thing here",
	},
	[paths.perks]: {
		title: "Perks",
		subTitle:
			"Shoutout to our sponsors! Here’s how they’re contributing to SpurHacks 2025.",
	},
	[paths.myAccount]: {
		title: "My Account",
		subTitle: "Manage your account details here",
	},
	[paths.scan]: {
		title: "QR Code Scanner",
		subTitle: "QR code scanning will be available during the event",
	},
};
