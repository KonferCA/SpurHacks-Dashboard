import { LoadingAnimation } from "@/components";
import { useAuth } from "@/providers";
import { useEffect, useRef, useState } from "react";

interface AuthLoadingGuardProps {
	children: React.ReactNode;
}

export const AuthLoadingGuard = ({ children }: AuthLoadingGuardProps) => {
	const { currentUser, isLoading: authLoading } = useAuth();
	const [isReady, setIsReady] = useState(false);
	const authStateRef = useRef({ user: currentUser, loading: authLoading });
	const timerRef = useRef<number | null>(null);

	// Track auth state changes
	useEffect(() => {
		authStateRef.current = { user: currentUser, loading: authLoading };

		// If auth is no longer loading, we can prepare to show content
		if (!authLoading) {
			// Small delay for smoother transition
			if (!isReady) {
				const readyTimer = window.setTimeout(() => {
					setIsReady(true);
				}, 100);

				return () => window.clearTimeout(readyTimer);
			}
		} else {
			// If we're loading again, we're not ready
			setIsReady(false);
		}
	}, [currentUser, authLoading]);

	// Fallback timer in case auth state never settles
	useEffect(() => {
		// Clear any existing timers
		if (timerRef.current) {
			window.clearTimeout(timerRef.current);
		}

		// Set a backup timer to ensure we don't wait indefinitely
		const fallbackTimer = window.setTimeout(() => {
			if (authStateRef.current.loading) {
				console.log(
					"Auth loading state taking too long in guard, forcing ready state",
				);
				setIsReady(true);
			}
		}, 2000);

		timerRef.current = fallbackTimer;

		return () => {
			if (timerRef.current) {
				window.clearTimeout(timerRef.current);
			}
		};
	}, []); // Only on component mount

	if (!isReady) {
		return <LoadingAnimation />;
	}

	return <>{children}</>;
};
