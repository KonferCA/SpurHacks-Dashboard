import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
	theme: {
		tokens: {
			colors: {
				brand: {
					primary: { value: "#FFB65F" },
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
	},
	globalCss: {
		html: {
			colorPalette: "brand",
		},
	},
});

export const system = createSystem(defaultConfig, config);
