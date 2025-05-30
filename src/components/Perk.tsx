import { Box, Flex, Heading, Image, Text, Icon, Link } from "@chakra-ui/react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { useState } from "react";
import { type PerksData } from "@/data/perks";

interface PerkProps {
	data: PerksData;
}

export function Perk({ data }: PerkProps) {
	const [isHovered, setIsHovered] = useState(false);
	const { title, description, image, alt, actions } = data;

	return (
		<Box
			h={{ base: "375px" }}
			borderStyle="solid"
			borderWidth="1px"
			overflowY="hidden"
			position="relative"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			style={{ perspective: "1000px" }}
		>
			<Box
				position="relative"
				w="full"
				h="full"
				style={{
					transformStyle: "preserve-3d",
					transition: "transform 0.6s",
					transform: isHovered ? "rotateY(180deg)" : "rotateY(0deg)",
				}}
			>
				{/* Front side - Image */}
				<Flex
					justifyContent="center"
					alignItems="center"
					h="full"
					w="full"
					position="absolute"
					style={{
						backfaceVisibility: "hidden",
					}}
					p="3.5rem"
				>
					<Image src={image} alt={alt} />
				</Flex>

				{/* Back side - Description */}
				<Flex
					h="full"
					w="full"
					position="absolute"
					bg="bg.hover"
					p="3.5rem"
					style={{
						backfaceVisibility: "hidden",
						transform: "rotateY(180deg)",
					}}
					flexDirection="column"
					gap="3.5rem"
					overflowY="auto"
				>
					<Heading textAlign="center">{title}</Heading>
					<Text textAlign="center">{description}</Text>
					{!!actions && (
						<Flex mt="auto" gap="2">
							{actions.map(({ link, title }) => (
								<Link
									key={link}
									href={link}
									target="_blank"
									rel="noopener noreferrer"
									marginLeft="auto"
									rounded="full"
									bg="brand.primary"
									color="brand.contrast"
									py="2.5"
									px="5"
									textTransform="uppercase"
									transition="colors"
									display="inline-block"
									_hover={{ textDecor: "none", bg: "brand.primary/90" }}
								>
									<Flex alignItems="center" gap="2">
										<Text>{title}</Text>
										<Icon size="md">
											<ArrowSquareOut />
										</Icon>
									</Flex>
								</Link>
							))}
						</Flex>
					)}
				</Flex>
			</Box>
		</Box>
	);
}
