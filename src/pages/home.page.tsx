import { GoldenHawk, IpadKidHawks } from "@/assets";
import { toaster } from "@/components/ui/toaster";
import { useApplications } from "@/hooks/use-applications";
import { useAuth } from "@/providers";
import { paths } from "@/providers/RoutesProvider/data";
import { withdrawRSVP } from "@/services/firebase/rsvp";
import { Button } from "@chakra-ui/react";
import { Accordion, Card, Modal, PageWrapper, SocialIcons } from "@components";
import { faqs, importantDateTimes, sponsors } from "@data";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
	const { deadlines } = useApplications();
	const navigate = useNavigate();

	return (
		<PageWrapper>
			<section className="homepage grid gap-4">
				<div className="grid xl:grid-cols-12 gap-4">
					{deadlines.inRange && (
						<div>
							<p>Applications for SpurHacks 2025 are open now!</p>
							<Button
								colorPalette="brand"
								onClick={() => navigate(paths.apply)}
								size="lg"
								className="mt-2"
							>
								Apply Now
							</Button>
						</div>
					)}
					{deadlines.beforeStart && (
						<div>
							<p>Applications for SpurHacks 2025 open on May 5, 2025.</p>
						</div>
					)}
					{deadlines.afterClose && (
						<div>
							<p>Applications have now closed for SpurHacks 2025.</p>
						</div>
					)}
				</div>
			</section>
		</PageWrapper>
	);
};

export { HomePage };
