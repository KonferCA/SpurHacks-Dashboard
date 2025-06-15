import { useUser } from "@/providers";
import { getApplicationsDraft } from "@/services/firebase/application";
import type { ApplicationDataDoc } from "@/services/firebase/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export type ApplicationDraftHookValue = {
	draft?: ApplicationDataDoc;
	isLoading: boolean;
	refreshDraft: () => Promise<void>;
};

/**
 * Hook for fetching application draft data
 * This is separated from useApplications to minimize requests
 * since drafts are only used in the apply page
 */
export const useApplicationDraft = () => {
	const { user } = useUser();
	const queryClient = useQueryClient();

	const { data: drafts, isLoading } = useQuery({
		queryKey: ["drafts", user],
		queryFn: async () => {
			if (!user) return [];
			return await getApplicationsDraft(user.uid);
		},
		enabled: !!user,
		staleTime: 0, // Always fetch fresh drafts since they update frequently
		gcTime: 10 * 60 * 1000, // 10 minutes
	});

	const refreshDraft = useCallback(() => {
		return queryClient.invalidateQueries({ queryKey: ["drafts"] });
	}, [queryClient]);

	return {
		draft: drafts?.[0],
		isLoading,
		refreshDraft,
	};
};
