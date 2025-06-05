import { PageWrapper } from "@/components";
import { Application } from "@/components/Application";
import { InfoCallout } from "@/components/InfoCallout/InfoCallout";
import { useApplications } from "@/hooks/use-applications";

export const ApplicationPage = () => {
	const { applications } = useApplications();
	const userApp = applications[0] || null;
	return (
		<PageWrapper>
			<div className="items-center gap-8 space-y-4 mb-4">
				<h3 className="text-md md:text-2xl font-bold">Application Status</h3>
				<div className="w-fit mb-4">
					{/* gotta explicitly check for "false" because not all apps have the accepted property which means that their apps are in review */}
					<InfoCallout
						text={
							userApp && userApp.applicationStatus !== "accepted"
								? "Unfortunately, due to high volume of applications and limited spots, we are unable to accept your application this year... We encourage you to try again next year."
								: "Applications have now closed for SpurHacks 2024."
						}
					/>
				</div>
			</div>
			{userApp && <Application app={userApp} />}
		</PageWrapper>
	);
};
