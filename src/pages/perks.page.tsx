import { PageWrapper } from "@/components";
import { PerksMLH } from "@/assets";
import {
	Button,
	Box,
	Flex,
	Grid,
	Heading,
	Image,
	Text,
	Icon,
	Link,
} from "@chakra-ui/react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { useState } from "react";

interface SponsorProps {
	imgSrc: string;
	name: string;
	description?: string;
	sponsorUrl?: string;
}

function Sponsor({ name, imgSrc, description, sponsorUrl }: SponsorProps) {
	const [isHovered, setIsHovered] = useState(false);

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
				>
					<Image src={imgSrc} alt={name} />
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
					justifyContent="space-between"
				>
					<Heading textAlign="center">{name}</Heading>
					<Text textAlign="center">{description}</Text>
					<Button
						as={Link}
						href={sponsorUrl}
						target="_blank"
						rel="noopener noreferrer"
						textTransform="uppercase"
						rounded="full"
					>
						visit website
						<Icon>
							<ArrowSquareOut />
						</Icon>
					</Button>
				</Flex>
			</Box>
		</Box>
	);
}

const sponsors = [
	{
		imgSrc: PerksMLH,
		name: "MLH 1",
		description:
			"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus placerat fermentum est et volutpat. Proin ac egestas risus. Phasellus accumsan consequat finibus. Curabitur a mattis.",
		sponsorUrl: "https://mlh.io/",
	},
	{
		imgSrc: PerksMLH,
		name: "MLH 2",
		description:
			"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus placerat fermentum est et volutpat. Proin ac egestas risus. Phasellus accumsan consequat finibus. Curabitur a mattis.",
		sponsorUrl: "https://mlh.io/",
	},
	{
		imgSrc: PerksMLH,
		name: "MLH 3",
		description:
			"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus placerat fermentum est et volutpat. Proin ac egestas risus. Phasellus accumsan consequat finibus. Curabitur a mattis.",
		sponsorUrl: "https://mlh.io/",
	},
];

const PerksPage = () => {
	return (
		<PageWrapper noPadding>
			<Grid
				templateColumns={{
					base: "1fr",
					sm: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))",
				}}
			>
				{sponsors.map((s) => (
					<Box key={s.name} w="full">
						<Sponsor {...s} />
					</Box>
				))}
			</Grid>
		</PageWrapper>
	);
};

export { PerksPage };
