import type { ApplicationData } from "@/forms/hacker-form/types";
import { getResume } from "@/services/firebase/files";
import { Button } from "@chakra-ui/react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { toaster } from "./ui/toaster";

interface ApplicationProps {
	app: ApplicationData;
}

const Field = ({
	label,
	value,
}: {
	label: string;
	value: string | string[];
}) => {
	if (typeof value === "string") {
		return (
			<div>
				<p className="font-medium">{label}</p>
				<p className="pl-4">{value}</p>
			</div>
		);
	}

	return (
		<div>
			<p className="font-medium">{label}</p>
			<ul className="pl-4">
				{value.map((m) => (
					<li key={m}>{m}</li>
				))}
			</ul>
		</div>
	);
};

export const Application: FC<ApplicationProps> = ({ app }) => {
	return (
		<div className="divide-y divide-gray-300 w-fit border-t border-gray-300 pb-8">
			<div className="py-2 space-y-2">
				<Field label="Name:" value={`${app.firstName} ${app.lastName}`} />
				<Field label="Age:" value={app.age} />
				<Field label="Country:" value={app.countryOfResidence} />
				<Field label="City:" value={app.city} />
				{/* <Field label="Phone:" value={app.phone} /> */}
				<Field label="Role:" value={app.participatingAs} />
				<Field label="Discord:" value={app.discord} />
			</div>
			<div className="py-2 space-y-2">
				<Field label="School:" value={app.school} />
				<Field label="Level of Study:" value={app.educationLevels} />
				<Field label="Major:" value={app.major} />
			</div>
			<div className="py-2 space-y-2">
				<Field label="Gender:" value={app.gender} />
				<Field label="Pronouns:" value={app.pronouns} />
				<Field label="Sexuality:" value={app.sexuality} />
				<Field label="Ethnicity:" value={app.race} />
			</div>
			<div className="py-2 space-y-2">
				<Field label="Dietry Restrictions:" value={app.diets} />
				<Field label="Allergies:" value={app.allergies} />
			</div>
			<div className="py-2 space-y-2">
				<Field label="Interests:" value={app.interests} />
				<Field label="Hackathon Experience:" value={app.hackathonExperience} />
				<Field
					label="Programming Languages:"
					value={app.programmingLanguages}
				/>
			</div>
			{app.participatingAs === "Hacker" && (
				<div className="py-2 space-y-2 max-w-lg">
					<Field
						label="Why do you want to participate at SpurHacks?"
						value={app.reasonToBeInSpurHacks}
					/>
					<Field
						label="In a few sentences, what up-and-coming or revolutionizing technology are you most excited about?"
						value={app.revolutionizingTechnology}
					/>
				</div>
			)}
			{app.generalResumeRef && (
				<div className="py-2">
					<p className="font-medium">Resume:</p>
					<Button
						onClick={() => {
							getResume(app.generalResumeRef).catch(() =>
								toaster.error({
									title: "Oops!",
									description: "Resume could not be downloaed.",
								}),
							);
						}}
					>
						Get Resume
					</Button>
				</div>
			)}
			<div className="py-2 space-y-2 max-w-lg">
				<div className="py-2 flex gap-4 items-center">
					{app.agreedToReceiveEmailsFromMLH ? (
						<CheckIcon className="ml-4 block text-tbrand w-10 h-10" />
					) : (
						<XMarkIcon className="ml-4 block text-red-500 w-10 h-10" />
					)}
					<span className="block">
						I authorize MLH to send me occasional emails about relevant events,
						career opportunities, and community announcements.
					</span>
				</div>
			</div>
		</div>
	);
};
