import { Logo } from "@assets";
import { Flex, Image, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";

interface LoadingAnimationProps {
	text?: string;
}

const bounce = keyframes`
  0%, 100% {
    transform: translateY(-25%);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
`;

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ text }) => {
	const bounceAnimation = `${bounce} 1s infinite`;

	return (
		<Flex
			h="100vh"
			alignItems="center"
			justifyContent="center"
			flexDirection="column"
			textAlign="center"
			px={4}
		>
			<Image
				src={Logo}
				alt="Loading Animation"
				w={{ base: "12", md: "16" }}
				animation={bounceAnimation}
				mb={4}
			/>

			<Text fontSize={{ base: "lg", md: "2xl" }} fontWeight="bold" mb={2}>
				{text || "Loading super awesome portal..."}
			</Text>

			<Text fontSize={{ base: "md", md: "lg" }} color="gray.500">
				Please be patient, <Text as="u">don't refresh!</Text>
			</Text>
		</Flex>
	);
};
