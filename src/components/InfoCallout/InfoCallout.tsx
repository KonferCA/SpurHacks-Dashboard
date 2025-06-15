import { type BoxProps, Card, CardBody, CardHeader } from "@chakra-ui/react";
import type { FC, ReactNode } from "react";

interface InfoCalloutProps extends BoxProps {
	title: string;
	body: ReactNode;
}

export const InfoCallout: FC<InfoCalloutProps> = ({ title, body, ...rest }) => {
	return (
		<Card.Root rounded="4xl" maxWidth="800px" {...rest}>
			<CardHeader>
				<Card.Title>{title}</Card.Title>
			</CardHeader>
			<CardBody>{body}</CardBody>
		</Card.Root>
	);
};
