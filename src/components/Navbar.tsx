import { FullLogo, Logo } from "@/assets";
import { useApplications } from "@/hooks/use-applications";
import type { AccessControlContext } from "@/navigation";
import { RouteConfig, useAuth } from "@/providers";
import { useRouteDefinitions, useUser } from "@/providers";
import { paths } from "@/providers/RoutesProvider/data";
import { Box, Flex, Link as ChakraLink, Text, Image } from "@chakra-ui/react";
import {
	CalendarDaysIcon,
	CodeBracketIcon,
	HomeIcon,
	ShareIcon,
	TicketIcon,
	UserGroupIcon,
} from "@heroicons/react/24/outline";
import Hamburger from "hamburger-react";
import { useEffect, useMemo, useState } from "react";
import { FiLogOut, FiMapPin } from "react-icons/fi";
import { RiDiscordLine } from "react-icons/ri";
import { RxStar } from "react-icons/rx";
import { Link } from "react-router-dom";
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
};

const MobileNav = ({ availableRoutes }: { availableRoutes: RouteConfig[] }) => {
	const { logout, currentUser: user } = useAuth();
	const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

	useEffect(() => {
		setMobileMenuOpen(false);
	}, [location]);

	return (
		<>
			<Flex
				as="nav"
				alignItems="center"
				justifyContent="space-between"
				padding="1rem"
			>
				<Flex alignItems="center" justifyContent="start">
					<Link to="/profile">
						<Image
							width="2.5rem"
							height="2.5rem"
							src={Logo}
							alt="SpurHacks Logo"
						/>
					</Link>
				</Flex>
				<Box>
					<Hamburger
						toggled={isMobileMenuOpen}
						toggle={setMobileMenuOpen}
						size={24}
						label="Show navigation menu"
					/>
				</Box>
			</Flex>

			<Box
				position="fixed"
				zIndex={20}
				right={0}
				top={0}
				maxWidth="full"
				blur="xl"
				height="full"
				transitionTimingFunction="ease-in-out"
				transitionDuration="300ms"
				transition="all"
				translateX={isMobileMenuOpen ? "0" : "100%"}
				opacity={isMobileMenuOpen ? 100 : 0}
			>
				<Box position="absolute" right="0.5rem" top="0.5rem">
					<Hamburger
						toggled={isMobileMenuOpen}
						toggle={setMobileMenuOpen}
						size={24}
						label="Show navigation menu"
					/>
				</Box>
				<Flex
					as="ul"
					direction="column"
					alignItems="start"
					justifyContent="start"
				>
					<ChakraLink
						href="https://maps.app.goo.gl/Fxic5XJBzZjHP4Yt5"
						target="_blank"
						rel="noopener noreferrer"
						width="full"
					>
						<Flex
							as="li"
							padding="1rem"
							transition="colors"
							cursor="pointer"
							alignItems="center"
							justifyContent="start"
							gap="0.5rem"
						>
							Location
						</Flex>
					</ChakraLink>
					{availableRoutes
						// @ts-ignore
						.filter(({ path }) => path && !!navItems[path])
						.map(({ path }) => {
							// @ts-ignore
							const { label, Icon } = navItems[path];
							return (
								<Link key={label} to={path as string} className="w-full">
									<li className="p-4 hover:bg-[#1F1E2E] duration-300 transition-colors rounded-md w-full  cursor-pointer flex items-center justify-start gap-2">
										<Icon className="w-4 h-4" />
										<span>{label}</span>
									</li>
								</Link>
							);
						})}
					<ChakraLink
						href="https://discord.com/invite/GxwvFEn9TB"
						target="_blank"
						rel="noopener noreferrer"
						width="full"
					>
						<Flex
							as="li"
							padding="1rem"
							transition="colors"
							cursor="pointer"
							alignItems="center"
							justifyContent="start"
							gap="0.5rem"
						>
							Discord Support
						</Flex>
					</ChakraLink>
				</Flex>

				{user && (
					<Button type="button" onClick={logout}>
						<FiLogOut size="1.5rem" />
						<Text>Sign out</Text>
					</Button>
				)}
			</Box>
		</>
	);
};

export const Navbar = () => {
	const { logout } = useAuth();

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
				<MobileNav availableRoutes={availableRoutes} />
			) : (
				<Flex
					as="nav"
					height="vh"
					position="fixed"
					insetY="0"
					width="18rem"
					padding="1rem"
					direction="column"
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
						<Flex
							as="ul"
							direction="column"
							alignItems="center"
							justifyContent="start"
							gap="1rem"
							width="full"
						>
							<ChakraLink
								width="full"
								href="https://maps.app.goo.gl/Fxic5XJBzZjHP4Yt5"
								target="_blank"
								rel="noopener noreferrer"
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
									return (
										<Link key={label} to={path as string} className="w-full">
											<Flex
												as="li"
												padding="1rem"
												width="full"
												cursor="pointer"
												gap="0.5rem"
												alignItems="center"
												justifyContent="start"
											>
												<Box asChild width="1.5rem" height="1.5rem">
													<Icon />
												</Box>
												<Text>{label}</Text>
											</Flex>
										</Link>
									);
								})}
							<ChakraLink
								width="full"
								href="https://maps.app.goo.gl/Fxic5XJBzZjHP4Yt5"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Flex
									padding="1rem"
									alignItems="center"
									justifyContent="start"
									gap="0.5rem"
									cursor="pointer"
								>
									<RiDiscordLine size="1.5rem" />
									Discord Support
								</Flex>
							</ChakraLink>
						</Flex>
						{user && (
							<Button type="button" onClick={logout}>
								<FiLogOut size="1.5rem" />
								<Text>Sign out</Text>
							</Button>
						)}
					</Flex>
				</Flex>
			)}
		</>
	);
};
