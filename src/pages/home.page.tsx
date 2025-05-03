import { useApplications } from "@/hooks/use-applications";
import { paths } from "@/providers/RoutesProvider/data";
import { Button } from "@chakra-ui/react";
import { PageWrapper } from "@components";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
	const { deadlines } = useApplications();
	const navigate = useNavigate();

	return (
		<PageWrapper>
			<section className="">
				{deadlines.inRange && (
					<div>
						<p>Applications for SpurHacks 2025 are open now!</p>
						<Button
							color="black"
							colorScheme="brand"
							onClick={() => navigate(paths.apply)}
							size="lg"
							rounded="full"
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
			</section>
		</PageWrapper>
	);
};

export { HomePage };
