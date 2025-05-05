import {
	Link as ChakraLink,
	LinkProps as ChakraLinkProps,
} from "@chakra-ui/react";
import {
	Link as RouterLink,
	LinkProps as RouterLinkProps,
} from "react-router-dom";
import { forwardRef } from "react";

type CombinedLinkProps = ChakraLinkProps & RouterLinkProps;

// Combines the functionality of react-router-dom with ChakraLink
export const RouterChakraLink = forwardRef<
	HTMLAnchorElement,
	CombinedLinkProps
>((props, ref) => <ChakraLink as={RouterLink} ref={ref} {...props} />);
