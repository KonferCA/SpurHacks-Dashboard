import { LoadingAnimation } from "@/components";
import { useAuth } from "@/providers";
import { useEffect, useState, useRef } from "react";

interface AuthLoadingGuardProps {
	children: React.ReactNode;
}

export const AuthLoadingGuard = ({ children }: AuthLoadingGuardProps) => {
	const { currentUser, isLoading: authLoading } = useAuth();
	const [isReady, setIsReady] = useState(false);
	const authStateRef = useRef({ user: currentUser, loading: authLoading });
	const timerRef = useRef<number | null>(null);

	useEffect(() => {
		authStateRef.current = { user: currentUser, loading: authLoading };
	}, [currentUser, authLoading]);

	useEffect(() => {
		if (timerRef.current) {
			window.clearTimeout(timerRef.current);
		}

		setIsReady(false);

		// timer that only resolves when auth state settles
		const timer = window.setTimeout(() => {
			if (!authStateRef.current.loading) {
				window.setTimeout(() => {
					setIsReady(true);
				}, 100);
			} else {
				timerRef.current = window.setTimeout(() => {
					if (!authStateRef.current.loading) {
						setIsReady(true);
					}
				}, 200);
			}
		}, 300);

		timerRef.current = timer;

		return () => {
			if (timerRef.current) {
				window.clearTimeout(timerRef.current);
			}
		};
	}, []); // on component mount

	if (!isReady) {
		return <LoadingAnimation />;
	}

	return <>{children}</>;
};
