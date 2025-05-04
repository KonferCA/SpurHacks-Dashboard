import { FullLogo, Knots } from "@/assets";
import { paths } from "@/providers/RoutesProvider/data";
import {
	Box,
	Flex,
	Heading,
	Text,
	Button,
	Link,
	Image,
} from "@chakra-ui/react";

export const NotFoundPage = () => {
	return (
		<Box
			minH="100vh"
			position="relative" // <-- important so the image is positioned relative to this
			overflow="hidden"
			style={{
				background: `radial-gradient(
                    circle at top left,
                    #000000 0%,
                    #191C26 30%,
                    #26252F 52%,
                    #332D38 65%,
                    #4D3E4A 78%,
                    #6B5C6D 90%,
                    #897B90 99%,
                    #C5B8D6 120%
                )`,
			}}
		>
			<Image
				src={Knots}
				position="absolute"
				top={0}
				left={0}
				w="100vw"
				h="100vh"
				objectFit="cover"
				zIndex={0}
			/>
			<Flex
				direction="column"
				align="center"
				justify="center"
				height="100%"
				minH="100vh"
				textAlign="center"
				px={4}
				gap={10}
			>
				<Image maxW="xs" src={FullLogo} />
				<Text
					maxW="lg"
					fontSize={["lg", "2xl", "3xl"]}
					fontWeight="semibold"
					color="white"
					fontFamily="Raleway, sans-serif"
				>
					Uh oh, looks like something went wrong.
				</Text>
				<Link textDecoration="none" href={paths.home}>
					<Button
						bg="#FFA75F"
						_hover={{
							bg: "#FFAF6E",
							opacity: 0.9,
						}}
						color="black"
						fontWeight="bold"
						py={2}
						px={6}
						rounded="full"
						transition="all 0.3s ease-in-out"
					>
						BACK TO DASHBOARD
					</Button>
				</Link>
			</Flex>
		</Box>
	);
};
