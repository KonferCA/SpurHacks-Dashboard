import type { ApplicationData } from "@/forms/hacker-form/types";
import { useUser } from "@/providers";
import { getUserApplications } from "@/services/firebase/application";
import type { ApplicationDataDoc } from "@/services/firebase/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

export type ApplicationsHookValue = {
	current?: ApplicationDataDoc;
	applications: ApplicationData[];
	refreshApplications: () => Promise<void>;
	isLoading: boolean;
};

/**
 * Hook for accessing application data
 */
export const useApplications = () => {
	const { user } = useUser();
	const queryClient = useQueryClient();

	const { data: applications, isLoading } = useQuery({
		queryKey: ["applications", user],
		queryFn: async () => {
			if (!user) return [];
			return await getUserApplications(user.uid);
		},
		enabled: !!user,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
	});

	/**
	 * Invalidates and refreshes the applications query
	 */
	const refreshApplications = useCallback(() => {
		return queryClient.invalidateQueries({ queryKey: ["applications"] });
	}, [queryClient]);

	const value = useMemo(() => {
		return {
			current: applications?.find((app) => app.hackathonYear === "2025"),
			applications: applications ?? [],
			refreshApplications,
			isLoading,
		} satisfies ApplicationsHookValue;
	}, [applications, refreshApplications, isLoading]);

	return value;
};
