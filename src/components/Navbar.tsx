import { DiscordLogo, FullLogo, Logo } from "@/assets";
import { useApplications } from "@/hooks/use-applications";
import type { AccessControlContext } from "@/navigation";
import {
	type RouteConfig,
	useAuth,
	useRouteDefinitions,
	useUser,
} from "@/providers";
import { paths } from "@/providers/RoutesProvider/data";
import {
	Box,
	Link as ChakraLink,
	CloseButton,
	Drawer,
	Flex,
	Image,
	Portal,
	Text,
} from "@chakra-ui/react";
import {
	CalendarDaysIcon,
	CodeBracketIcon,
	HomeIcon,
	ShareIcon,
	TicketIcon,
	UserGroupIcon,
	Cog8ToothIcon,
} from "@heroicons/react/24/outline";
import Hamburger from "hamburger-react";
import { useEffect, useMemo, useState } from "react";
import { FiLogOut, FiMapPin } from "react-icons/fi";
import { RxStar } from "react-icons/rx";
import { Link } from "react-router-dom";
import { RouterChakraLink } from "./RouterChakraLink";
import { Button } from "./ui/button";

const navItems = {
	[paths.home]: {
		label: "Home",
		Icon: HomeIcon,
	},
	[paths.schedule]: {
		label: "Schedule",
		Icon: CalendarDaysIcon,
	},
	[paths.networking]: {
		label: "Networking",
		Icon: ShareIcon,
	},
	[paths.myTicket]: {
		label: "My Ticket",
		Icon: TicketIcon,
	},
	[paths.apply]: {
		label: "Application",
		Icon: CodeBracketIcon,
	},
	[paths.myTeam]: {
		label: "My Team",
		Icon: UserGroupIcon,
	},
	[paths.perks]: {
		label: "Perks",
		Icon: RxStar,
	},
	[paths.accountSettings]: {
		label: "Account",
		Icon: Cog8ToothIcon,
	},
};

const MobileNav = ({
	availableRoutes,
	isMobile,
}: {
	availableRoutes: RouteConfig[];
	isMobile: boolean;
}) => {
	const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

	useEffect(() => {
		setMobileMenuOpen(false);
	}, [location]);

	return (
		<>
			{/* Mobile: Navbar Closed */}
			<Flex
				as="nav"
				alignItems="center"
				justifyContent="space-between"
				padding="1rem"
			>
				<Flex alignItems="center" justifyContent="start">
					<Link to="/home">
						<Image
							width="3rem"
							height="2.5rem"
							src={Logo}
							alt="SpurHacks Logo"
						/>
					</Link>
				</Flex>
				<Drawer.Root
					open={isMobileMenuOpen}
					onOpenChange={(e) => setMobileMenuOpen(e.open)}
				>
					<Drawer.Trigger asChild>
						<Hamburger
							toggled={isMobileMenuOpen}
							toggle={setMobileMenuOpen}
							size={24}
							label="Show navigation menu"
						/>
					</Drawer.Trigger>
					<Portal>
						<Drawer.Backdrop />
						<Drawer.Positioner>
							<Drawer.Content bg="#181C2B">
								<Drawer.Header>
									<Drawer.Title />
								</Drawer.Header>
								<Drawer.Body>
									<Flex
										direction="column"
										alignItems="center"
										justifyContent="space-between"
										height="full"
										pb="10"
									>
										<NavbarContent
											availableRoutes={availableRoutes}
											isMobile={isMobile}
										/>
									</Flex>
								</Drawer.Body>
								<Drawer.CloseTrigger asChild>
									<CloseButton size="sm" />
								</Drawer.CloseTrigger>
							</Drawer.Content>
						</Drawer.Positioner>
					</Portal>
				</Drawer.Root>
			</Flex>
		</>
	);
};

const NavbarContent = ({
	availableRoutes,
	isMobile,
}: {
	availableRoutes: RouteConfig[];
	isMobile: boolean;
}) => {
	const { logout, currentUser: user } = useAuth();
	return (
		<>
			<Flex
				as="ul"
				direction="column"
				alignItems="start"
				justifyContent="start"
				gap="1rem"
				w="full"
				pt={5}
				px={2}
			>
				<ChakraLink
					w="full"
					href="https://maps.app.goo.gl/NxPavuKXyiT6fhH87"
					target="_blank"
					rel="noopener noreferrer"
					textDecoration="none"
					color="#666484"
					rounded="full"
					_hover={{
						bg: "#1F1E2E",
					}}
					_focus={
						isMobile
							? {}
							: {
									boxShadow: "none",
									outline: "none",
								}
					}
				>
					<Flex
						padding="1rem"
						alignItems="center"
						justifyContent="start"
						gap="0.5rem"
						cursor="pointer"
					>
						<FiMapPin size="1.5rem" />
						Location
					</Flex>
				</ChakraLink>
				{availableRoutes
					// @ts-ignore
					.filter(({ path }) => path && !!navItems[path])
					.map(({ path }) => {
						// @ts-ignore
						const { label, Icon } = navItems[path];
						const isActive = location.pathname === path;
						return (
							// <Link to={path as string} className="w-full">
							<RouterChakraLink
								key={label}
								as={Link}
								to={path as string}
								w="full"
								textDecoration="none"
								color="#666484"
								rounded="full"
								bg={isActive ? "#1F1E2E" : "transparent"}
								_hover={{
									bg: "#1F1E2E",
								}}
							>
								<Flex
									as="li"
									padding="1rem"
									w="full"
									cursor="pointer"
									gap="0.5rem"
									alignItems="center"
									justifyContent="start"
								>
									<Box asChild width="1.5rem" height="1.5rem">
										<Icon color={isActive ? "#FFA75F" : "#666483"} />
									</Box>
									<Text color={isActive ? "#DEEBFF" : "#666484"}>{label}</Text>
								</Flex>
							</RouterChakraLink>
							// </Link>
						);
					})}
				<ChakraLink
					w="full"
					href="https://discord.gg/NpnSUrZJQy"
					target="_blank"
					rel="noopener noreferrer"
					textDecoration="none"
					color="#666484"
					rounded="full"
					_hover={{
						bg: "#1F1E2E",
					}}
					_focus={
						isMobile
							? {}
							: {
									boxShadow: "none",
									outline: "none",
								}
					}
				>
					<Flex
						padding="1rem"
						alignItems="center"
						justifyContent="start"
						gap="0.5rem"
						cursor="pointer"
					>
						<Image
							src={DiscordLogo}
							filter="brightness(0) saturate(100%) invert(44%) sepia(6%) saturate(1804%) hue-rotate(205deg) brightness(89%) contrast(93%)"
							width="1.5rem"
							height="1.5rem"
						/>
						Discord Support
					</Flex>
				</ChakraLink>
			</Flex>
			{user && (
				<Button
					type="button"
					rounded="full"
					textTransform="uppercase"
					onClick={logout}
				>
					<FiLogOut size="1.5rem" color="black" />
					Sign out
				</Button>
			)}
		</>
	);
};

export const Navbar = () => {
	const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
	const { user } = useUser();
	const applicationsCtx = useApplications();
	const routes = useRouteDefinitions();

	const availableRoutes = useMemo(() => {
		return routes.filter((route) => {
			// Default to include in navbar if no access check defined
			if (typeof route.accessCheck === "undefined") return true;
			const ctx: AccessControlContext = {
				user,
				applicationsCtx,
			};
			try {
				if (typeof route.accessCheck === "function")
					return route.accessCheck(ctx);
				if (Array.isArray(route.accessCheck))
					return route.accessCheck.every((check) => check(ctx));
			} catch (e) {
				// do nothing
			}

			// Default to exclude if access check type is not recognized
			return false;
		});
	}, [routes, applicationsCtx]);

	const updateNavbarState = () => {
		setIsMobile(window.innerWidth <= 768);
	};

	useEffect(() => {
		window.addEventListener("resize", updateNavbarState);
		return () => {
			window.removeEventListener("resize", updateNavbarState);
		};
	}, []);

	return (
		<>
			{isMobile ? (
				<MobileNav availableRoutes={availableRoutes} isMobile={isMobile} />
			) : (
				<Flex
					as="nav"
					height="vh"
					position="fixed"
					insetY="0"
					width="18rem"
					padding="1rem"
					direction="column"
					borderRightColor="#1F1E2E"
					borderRightStyle="solid"
					borderRightWidth={1}
					style={{
						background: `radial-gradient(
							circle at top left,
							#000000 -100%,
							#191C26 80%,
							#26252F 110%,
							#332D38 130%,
							#4D3E4A 150%,
							#6B5C6D 170%,
							#897B90 180%,
							#C5B8D6 250%
						)`,
					}}
				>
					<Flex alignItems="center" justifyContent="center" padding="1rem">
						<Link to={paths.home}>
							<Box width="full" height="30px">
								<img src={FullLogo} alt="SpurHacks Logo" />
							</Box>
						</Link>
					</Flex>

					<Flex
						as="aside"
						direction="column"
						alignItems="center"
						justifyContent="space-between"
						height="83%"
						overflowY="auto"
					>
						<NavbarContent
							availableRoutes={availableRoutes}
							isMobile={isMobile}
						/>
					</Flex>
				</Flex>
			)}
		</>
	);
};
