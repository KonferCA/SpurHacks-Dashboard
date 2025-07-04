import type { ComponentProps } from "@/components/types";
import { type FC, useEffect, useMemo, useRef, useState } from "react";
import {
	Outlet,
	Route,
	RouterProvider,
	createBrowserRouter,
	createRoutesFromElements,
} from "react-router-dom";

import { LoadingAnimation } from "@/components";
import { useApplications } from "@/hooks/use-applications";
import { useDeadlines } from "@/hooks/use-deadlines";
import { AccessControl } from "@/navigation/AccessControl/AccessControl";
import { useAuth } from "@/providers";

// Public pages
import { LoginPage } from "@/pages/login.page";
import { ScanPage } from "@/pages/scan.page";

import { ApplyPage } from "@/pages/apply.page";
import { HomePage } from "@/pages/home.page";
import { JoinTeamPage } from "@/pages/join-team.page";
import { MyTeamPage } from "@/pages/my-team.page";
import { MyTicketPage } from "@/pages/my-ticket.page";
import { NetworkingPage } from "@/pages/networking.page";
import { PerksPage } from "@/pages/perks.page";
// Private pages
import { SchedulePage } from "@/pages/schedule.page";

import { AdminScanPage } from "@/pages/admin-scan.page";
// Admin pages
import { AdminPage } from "@/pages/admin/Admin.page";
import { AdminManageEventsPage } from "@/pages/admin/manage-events.page";

// Miscellaneous pages
import { NotFoundPage } from "@/pages/miscellaneous/not-found.page";
import { VerifyEmailPage } from "@/pages/miscellaneous/verify-email.page";
import { ViewTicketPage } from "@/pages/miscellaneous/view-ticket.page";

import { Redirect } from "@/navigation/redirect";

import { AccountPage } from "@/pages/account.page";
// Local imports
import {
	disable,
	hasApplied,
	hasRSVP,
	hasVerifiedEmail,
	isAccepted,
	isAdmin,
	isAppOpen,
	isAuthenticated,
	isVolunteerT1,
	isVolunteerT2,
	oneOf,
} from "./accessChecks";
import { RoutesContext } from "./context";
import { paths } from "./data";
import type { RouteConfig } from "./types";

/**
 * Creates a wrapper component for routes with access control
 */
const createAccessControlWrapper = (config: RouteConfig) => {
	const AccessControlWrapper = () => (
		<AccessControl
			accessCheck={config.accessCheck}
			fallbackRedirect={config.fallbackRedirect}
		>
			<Outlet />
		</AccessControl>
	);

	return AccessControlWrapper;
};

/**
 * Converts RouteConfig to React Router's Route elements for createRoutesFromElements
 */
const convertToRouteElements = (routeConfigs: RouteConfig[]) => {
	return routeConfigs.map((config) => {
		// If there's an access check, create a wrapper component with AccessControl
		if (config.accessCheck) {
			const AccessControlWrapper = createAccessControlWrapper(config);

			return (
				<Route
					key={config.path}
					path={config.path}
					element={<AccessControlWrapper />}
				>
					<Route index element={config.element} />
					{config.children && convertToRouteElements(config.children)}
				</Route>
			);
		}

		// No access check, return the route element directly
		return (
			<Route key={config.path} path={config.path} element={config.element}>
				{config.children && convertToRouteElements(config.children)}
			</Route>
		);
	});
};

/**
 * Router component that creates data router from route configurations
 */
const Router = ({ routes }: { routes: RouteConfig[] }) => {
	// Convert route configs to route elements
	const routeElements = useMemo(() => convertToRouteElements(routes), [routes]);

	// Create the data router using createRoutesFromElements
	const router = useMemo(
		() => createBrowserRouter(createRoutesFromElements(routeElements)),
		[routeElements],
	);

	return <RouterProvider router={router} />;
};

/**
 * Routes provider that controls what routes are available and should be rendered
 * Manages route generation, access control, and loading states
 */
export const RoutesProvider: FC<ComponentProps> = () => {
	// State for tracking loading state
	const [loadingRoutes, setLoadingRoutes] = useState(true);
	// Ref for timeout to manage loading state
	const timeoutRef = useRef<number | null>(null);
	// Get current user and application data
	const { isLoading: loadingAuth } = useAuth();
	const { isLoading: loadingApplications } = useApplications();
	const { isLoading: loadingDeadlines } = useDeadlines();

	// State for storing generated routes
	const routes = useMemo(() => {
		// Public routes that don't require authentication
		const publicRoutes: RouteConfig[] = [
			{
				path: paths.login,
				element: <LoginPage />,
			},
			{
				path: paths.scan,
				element: <ScanPage />,
			},
			{
				path: paths.ticket,
				element: <ViewTicketPage />,
			},
			{
				path: paths.schedule,
				element: <SchedulePage />,
			},
			{
				path: paths.notFound,
				element: <NotFoundPage />,
			},
		];

		// Routes requiring basic authentication
		const authenticatedRoutes: RouteConfig[] = [
			{
				path: paths.verifyEmail,
				element: <VerifyEmailPage />,
				accessCheck: isAuthenticated,
			},
		];

		// Routes requiring email verification
		const verifiedEmailRoutes: RouteConfig[] = [
			{
				path: paths.root,
				element: <HomePage />,
				accessCheck: [isAuthenticated, hasVerifiedEmail],
			},
			{
				path: paths.home,
				element: <HomePage />,
				accessCheck: [isAuthenticated, hasVerifiedEmail],
			},
			{
				path: paths.networking,
				element: <NetworkingPage />,
				accessCheck: [isAuthenticated, hasVerifiedEmail, isAccepted, hasRSVP],
			},
			{
				path: paths.myTicket,
				element: <MyTicketPage />,
				accessCheck: [isAuthenticated, hasVerifiedEmail, isAccepted, hasRSVP],
			},
			{
				path: paths.apply,
				element: <ApplyPage />,
				accessCheck: [
					isAuthenticated,
					hasVerifiedEmail,
					(ctx) => {
						if (hasApplied(ctx)) throw new Redirect(paths.home);
						return true;
					},
					isAppOpen,
				],
			},
			{
				path: paths.myTeam,
				element: <MyTeamPage />,
				accessCheck: [isAuthenticated, hasVerifiedEmail, isAccepted, hasRSVP],
			},
			{
				path: paths.joinTeam,
				element: <JoinTeamPage />,
				accessCheck: [
					isAuthenticated,
					hasVerifiedEmail,
					isAccepted,
					hasRSVP,
					disable,
				],
			},
			{
				path: paths.perks,
				element: <PerksPage />,
				accessCheck: [
					isAuthenticated,
					hasVerifiedEmail,
					isAccepted,
					hasRSVP,
					disable,
				],
			},
			{
				path: paths.myAccount,
				element: <AccountPage />,
				accessCheck: [isAuthenticated, hasVerifiedEmail],
			},
		];

		// Admin-only routes
		const adminRoutes: RouteConfig[] = [
			{
				path: paths.admin,
				element: <AdminPage />,
				accessCheck: [
					isAuthenticated,
					hasVerifiedEmail,
					oneOf(isAdmin, isVolunteerT1, isVolunteerT2),
				],
			},
			{
				path: paths.adminViewTicket,
				element: <AdminScanPage />,
				accessCheck: [
					isAuthenticated,
					hasVerifiedEmail,
					oneOf(isAdmin, isVolunteerT1, isVolunteerT2),
				],
			},
			{
				path: paths.adminManageEvents,
				element: <AdminManageEventsPage />,
				accessCheck: [isAuthenticated, hasVerifiedEmail, isAdmin],
			},
			{
				path: paths.adminScan,
				element: <AdminScanPage />,
				accessCheck: [
					isAuthenticated,
					hasVerifiedEmail,
					oneOf(isAdmin, isVolunteerT1, isVolunteerT2),
				],
			},
		];

		// Combine all route groups
		return [
			...publicRoutes,
			...authenticatedRoutes,
			...verifiedEmailRoutes,
			...adminRoutes,
		];
	}, []);

	// Manage loading state with delay to prevent flashing
	useEffect(() => {
		setLoadingRoutes(true);

		// Cleanup function to clear timeout
		const cleanUp = () => {
			if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
		};

		// Clear any existing timeout
		if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

		if (
			routes.length &&
			!loadingApplications &&
			!loadingAuth &&
			!loadingDeadlines
		) {
			// Prevent random flashes in the DOM due to updates
			timeoutRef.current = window.setTimeout(
				() => setLoadingRoutes(false),
				250,
			);
			return cleanUp;
		}

		// Set timeout to turn off loading state after delay
		timeoutRef.current = window.setTimeout(() => setLoadingRoutes(false), 1500);

		return cleanUp;
	}, [loadingAuth, routes, loadingApplications, loadingDeadlines]);

	return (
		<RoutesContext.Provider
			value={{
				routes,
				loadingRoutes,
			}}
		>
			{loadingRoutes ? <LoadingAnimation /> : <Router routes={routes} />}
		</RoutesContext.Provider>
	);
};
