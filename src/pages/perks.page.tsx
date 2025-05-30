import { PageWrapper } from "@/components";
import { Box, Grid } from "@chakra-ui/react";
import { perksData } from "@/data/perks";
import { Perk } from "@/components/Perk";

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
