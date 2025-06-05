import { AirBalloon, CloudLL, CloudRR, Logo } from "@/assets";
import { useApplications } from "@/hooks/use-applications";
import { paths } from "@/providers/RoutesProvider/data";
import { Link, Navigate } from "react-router-dom";

export const PostSubmissionPage = () => {
	const { applications } = useApplications();

	if (!applications.length) return <Navigate to={paths.apply} />;

	return (
		<div className="fixed inset-0 bg-radial-gradient-peach overflow-y-auto">
			{/* balloon */}
			<img
				src={AirBalloon}
				aria-hidden
				className="absolute h-24 sm:h-52 -z-10 right-1/2 translate-x-1/2 md:h-auto"
			/>
			{/* left most cloud */}
			<img
				src={CloudLL}
				aria-hidden
				className="absolute -z-10 left-6 top-16 md:top-36 w-12 sm:w-24 md:w-auto"
			/>
			{/* top right cloud */}
			<img
				src={CloudLL}
				aria-hidden
				className="absolute -z-10 right-10 sm:right-20 md:right-[20%] top-0 w-16 sm:w-28 md:w-auto"
			/>
			{/* top left cloud */}
			<img
				src={CloudRR}
				aria-hidden
				className="absolute -z-10 right-3/4 top-1 w-14 md:w-32"
			/>
			{/* right most cloud */}
			<img
				src={CloudRR}
				aria-hidden
				className="absolute -z-10 right-2 top-20 w-16 md:w-32"
			/>
			<div className="w-full h-full px-8 flex py-32 sm:py-60 md:py-80 items-center flex-col text-center">
				<h1 className="text-2xl sm:text-4xl whitespace-nowrap font-bold bg-clip-text text-transparent bg-gradient-to-b from-deepMarine to-tbrand-highlight">
					Thanks for your submission!
				</h1>
				<p className="text-deepMarine font-medium sm:text-lg mt-4 sm:mt-7">
					{"We'll send out acceptances after the application period."}
				</p>
				<p className="text-deepMarine font-medium mt-2 sm:text-lg">
					{"Team registration begins once you're accepted! See you soon :)"}
				</p>
				<p className="text-deepMarine font-semibold sm:text-lg mt-8">
					If you have any other questions, <br className="sm:hidden" />
					feel free to email us at
					<br />{" "}
					<a href="mailto:hello@hawkhacks.ca" className="underline font-bold">
						hello@hawkhacks.ca
					</a>{" "}
					or <br className="sm:hidden" />
					ask us in our{" "}
					<a
						href="https://discord.com/invite/GxwvFEn9TB"
						target="_blank"
						rel="noopener noreferrer"
						className="underline font-bold"
					>
						SpurHacks Discord
					</a>{" "}
					server!
				</p>
				<div className="mt-12">
					<Link to="/">Back to Home</Link>
				</div>
				<div className="flex gap-2 items-center mt-12">
					<img alt="Hawkhacks logo" src={Logo} className="w-6 h-6" />
					<span className="font-bold bg-clip-text bg-gradient-to-b from-deepMarine to-tbrand-highlight text-transparent sm:text-lg">
						SpurHacks
					</span>
				</div>
			</div>
		</div>
	);
};
