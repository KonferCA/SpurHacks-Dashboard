import type { ApplicationData } from "@/forms/hacker-form/types";
import { useUser } from "@/providers";
import {
	getApplicationsDraft,
	getUserApplications,
} from "@/services/firebase/application";
import { getDeadlines } from "@/services/firebase/deadlines";
import { ApplicationDataDoc } from "@/services/firebase/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { useCallback, useMemo } from "react";

export type ApplicationsHookValue = {
	current?: ApplicationDataDoc;
	applications: ApplicationData[];
	drafts: ApplicationData[];
	deadlines: {
		beforeStart: boolean;
		afterClose: boolean;
		inRange: boolean;
	};
	refreshApplications: () => Promise<void>;
	refreshDrafts: () => Promise<void>;
	isLoading: boolean;
};

/**
 * Hook for accessing application data
 */
export const useApplications = () => {
	const { user } = useUser();
	const queryClient = useQueryClient();

	const { data: applications = [], isLoading: loadingApplications } = useQuery({
		queryKey: ["applications"],
		queryFn: async () => {
			if (!user) return [];
			return await getUserApplications(user.uid);
		},
		initialData: [],
		enabled: !!user,
	});

	const { data: drafts = [], isLoading: loadingDrafts } = useQuery({
		queryKey: ["drafts"],
		queryFn: async () => {
			if (!user) return [];
			return await getApplicationsDraft(user.uid);
		},
		initialData: [],
		enabled: !!user,
	});

	const { data: deadlines, isLoading: loadingDeadlines } = useQuery({
		queryKey: ["deadlines"],
		queryFn: async () => {
			try {
				const deadlines = await getDeadlines();
				// sanity check that nothing is undefined or empty string
				if (!deadlines || !deadlines.appStartDate || !deadlines.appCloseDate)
					return {
						beforeStart: false,
						afterClose: false,
						inRange: false,
						startDateStr: "",
						closeDateStr: "",
					};

				const today = new Date();
				const startDate = parseISO(deadlines.appStartDate);
				const closeDate = parseISO(deadlines.appCloseDate);
				const before = isBefore(today, startDate);
				const after = isAfter(today, closeDate);
				const between = !before && !after;
				return {
					beforeStart: before,
					afterClose: after,
					inRange: between,
					startDateStr: format(startDate, "MMM d, yyyy"),
					closeDateStr: format(closeDate, "MMM d, yyyy"),
				};
			} catch (error) {
				console.error(error);
				return {
					beforeStart: false,
					afterClose: false,
					inRange: false,
				};
			}
		},
		initialData: {
			beforeStart: false,
			afterClose: false,
			inRange: false,
		},
	});

	/**
	 * Invalidates and refreshes the applications query
	 */
	const refreshApplications = useCallback(() => {
		return queryClient.invalidateQueries({ queryKey: ["applications"] });
	}, [queryClient]);

	/**
	 * Invalidates and refreshes the applications query
	 */
	const refreshDrafts = useCallback(() => {
		return queryClient.invalidateQueries({ queryKey: ["drafts"] });
	}, [queryClient]);

	const value = useMemo(() => {
		return {
			current: applications.find((app) => app.hackathonYear === "2025"),
			deadlines,
			drafts,
			applications,
			refreshApplications,
			refreshDrafts,
			isLoading: loadingApplications || loadingDeadlines || loadingDrafts,
		} satisfies ApplicationsHookValue;
	}, [
		deadlines,
		applications,
		refreshApplications,
		loadingApplications,
		loadingDeadlines,
	]);

	return value;
};
