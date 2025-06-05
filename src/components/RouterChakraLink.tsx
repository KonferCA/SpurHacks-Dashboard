import {
	Link as ChakraLink,
	LinkProps as ChakraLinkProps,
} from "@chakra-ui/react";
import { forwardRef } from "react";
import {
	Link as RouterLink,
	LinkProps as RouterLinkProps,
} from "react-router-dom";

type CombinedLinkProps = ChakraLinkProps & RouterLinkProps;

// Combines the functionality of react-router-dom with ChakraLink
export const RouterChakraLink = forwardRef<
	HTMLAnchorElement,
	CombinedLinkProps
>((props, ref) => <ChakraLink as={RouterLink} ref={ref} {...props} />);
