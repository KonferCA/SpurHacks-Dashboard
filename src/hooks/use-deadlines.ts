import { useUser } from "@/providers";
import { getDeadlines } from "@/services/firebase/deadlines";
import { useQuery } from "@tanstack/react-query";
import { format, isAfter, isBefore, parseISO } from "date-fns";

export type DeadlinesHookValue = {
	deadlines: {
		beforeStart: boolean;
		afterClose: boolean;
		inRange: boolean;
		startDateStr?: string;
		closeDateStr?: string;
	};
	isLoading: boolean;
};

/**
 * Hook for fetching application deadlines
 * This is separated from useApplications to minimize requests
 * since deadlines are only used in specific pages
 */
export const useDeadlines = () => {
	const { user } = useUser();

	const { data: deadlines, isLoading } = useQuery({
		queryKey: ["deadlines", user],
		queryFn: async () => {
			if (!user) return;
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
			}
			return;
		},
		enabled: !!user,
		staleTime: 30 * 60 * 1000, // 30 minutes - deadlines don't change often
		gcTime: 60 * 60 * 1000, // 1 hour
	});

	return {
		deadlines: deadlines ?? {
			beforeStart: false,
			afterClose: false,
			inRange: false,
		},
		isLoading,
	};
};
