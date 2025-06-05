import { PageWrapper } from "@/components";
import { Perk } from "@/components/Perk";
import { perksData } from "@/data/perks";
import { Box, Grid } from "@chakra-ui/react";

const PerksPage = () => {
	return (
		<PageWrapper noPadding>
			<Grid
				templateColumns={{
					base: "1fr",
					sm: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))",
				}}
			>
				{perksData.map((p) => (
					<Box key={p.title} w="full">
						<Perk data={p} />
					</Box>
				))}
			</Grid>
		</PageWrapper>
	);
};

export { PerksPage };
