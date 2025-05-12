import type { ComponentProps } from "@/components/types";
import { useHeaderInfo } from "@/providers";
import { Box, Link as ChakraLink, Heading, Text } from "@chakra-ui/react";
import { Navbar } from "@components";
import type { FC } from "react";

export const PageWrapper: FC<ComponentProps> = ({ children }) => {
	let headerInfo = useHeaderInfo() ?? {
		title: "Wow!",
		subTitle: "How did you end up here?",
	};

	if (location.pathname.startsWith("/ticket")) {
		headerInfo = {
			title: "Networking",
			subTitle: "A quick way to connect with new people at SpurHacks!",
		};
	}

	return (
		<Box>
			<Navbar />

			{/* right hand side */}
			<Box paddingLeft={{ md: "18rem" }}>
				<Box
					position="sticky"
					top={0}
					zIndex={10}
					paddingX="1.5rem"
					paddingY={{ base: "0.5rem", md: "2rem" }}
					width="full"
					borderBottomWidth={1}
					borderBottomColor="#1F1E2E"
					borderBottomStyle="solid"
					bg="brand.bg"
				>
					<Heading size={{ base: "lg", md: "3xl" }}>{headerInfo.title}</Heading>
					<Text marginTop={{ base: "0", md: "1rem" }}>
						{headerInfo.subTitle}
					</Text>
					<Text className="text-gray-800 mt-2">
						Having trouble? Get help in our{" "}
						<ChakraLink
							href="https://discord.gg/NpnSUrZJQy"
							target="_blank"
							rel="noopener noreferrer"
							color="skyblue"
							textDecor="underline"
						>
							Discord
						</ChakraLink>{" "}
						support channel.
					</Text>
				</Box>
				<Box padding="1.5rem">{children}</Box>
			</Box>
		</Box>
	);
};
