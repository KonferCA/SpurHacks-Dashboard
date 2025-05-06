import { useCallback, useEffect, useRef } from "react";

export function useDebounce<T extends (...args: unknown[]) => unknown>(
	callback: T,
	delay = 500,
	deps: unknown[] = [],
): T {
	// use ref to store the timeout ID so it persists across renders
	const timeoutRef = useRef<number | null>(null);

	// clean up the timeout when the component unmounts
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: must spread dependencies because the number of dependencies is unknown
	return useCallback(
		(...args: Parameters<T>) => {
			// clear the previous timeout if it exists
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			// set up new timeout
			timeoutRef.current = window.setTimeout(() => {
				callback(...args);
			}, delay);
		},
		[delay, ...deps],
	) as T;
}
