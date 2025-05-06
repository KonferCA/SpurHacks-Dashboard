import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
	theme: {
		tokens: {
			colors: {
				brand: {
					primary: { value: "#FFB65F" },
					subtle: { value: "#666484" },
					bg: { value: "#13151c" },
				},
				offwhite: {
					primary: { value: "#DEEBFF" },
				},
			},
		},
		semanticTokens: {
			colors: {
				brand: {
					solid: { value: "{colors.brand.primary}" },
				},
			},
		},
		breakpoints: {
			bipolarBigBoi: "1511px",
			bipolarNotSoBigBoi: "1300px",
		},
	},
	globalCss: {
		html: {
			colorPalette: "brand",
		},
	},
});

export const system = createSystem(defaultConfig, config);
