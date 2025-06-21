import { FullLogo, Knots } from "@/assets";
import { useAuth } from "@/providers";
import { paths } from "@/providers/RoutesProvider/data";
import { Box, Button, Flex, Image, Link, Text, VStack } from "@chakra-ui/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const ScanPage = () => {
	const { currentUser } = useAuth();
	const navigate = useNavigate();

	// redirect admins to admin scan page
	useEffect(() => {
		if (currentUser?.hawkAdmin) {
			navigate(paths.adminScan);
		}
	}, [currentUser, navigate]);
	return (
		<Box
			minH="100vh"
			position="relative"
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
				gap={8}
			>
				<Image maxW="xs" src={FullLogo} />
				<VStack gap={4}>
					<Text
						maxW="lg"
						fontSize={["2xl", "3xl", "4xl"]}
						fontWeight="bold"
						color="white"
						fontFamily="Raleway, sans-serif"
					>
						QR Code Scanner
					</Text>
					<Text
						maxW="md"
						fontSize={["md", "lg", "xl"]}
						fontWeight="medium"
						color="white"
						fontFamily="Raleway, sans-serif"
						opacity={0.9}
					>
						QR code scanning won't be live until the weekend.
					</Text>
					<Text
						maxW="lg"
						fontSize={["sm", "md"]}
						color="white"
						fontFamily="Raleway, sans-serif"
						opacity={0.7}
						mt={2}
					>
						Check back during the event for networking and other interactive
						features!
					</Text>
				</VStack>
				<Link textDecoration="none" href={paths.home}>
					<Button
						bg="#FFA75F"
						_hover={{
							bg: "#FFAF6E",
							opacity: 0.9,
						}}
						color="black"
						fontWeight="bold"
						py={3}
						px={8}
						rounded="full"
						transition="all 0.3s ease-in-out"
						fontSize="md"
					>
						BACK TO DASHBOARD
					</Button>
				</Link>
			</Flex>
		</Box>
	);
};
