"use client";

import {
	Toaster as ChakraToaster,
	Icon,
	Portal,
	Spinner,
	Stack,
	Toast,
	createToaster,
} from "@chakra-ui/react";
import { Info } from "@phosphor-icons/react";

export const toaster = createToaster({
	placement: "bottom-end",
	pauseOnPageIdle: true,
});

export const Toaster = () => {
	return (
		<Portal>
			<ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }}>
				{(toast) => (
					<Toast.Root
						width={{ md: "sm" }}
						background={toast.type === "info" ? "#333147" : undefined}
						color="offwhite.primary"
					>
						{toast.type === "loading" ? (
							<Spinner size="sm" color="blue.solid" />
						) : toast.type === "info" ? (
							<Icon size="md">
								<Info />
							</Icon>
						) : (
							<Toast.Indicator />
						)}
						<Stack gap="1" flex="1" maxWidth="100%">
							{toast.title && <Toast.Title>{toast.title}</Toast.Title>}
							{toast.description && (
								<Toast.Description>{toast.description}</Toast.Description>
							)}
						</Stack>
						{toast.action && (
							<Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>
						)}
						{toast.meta?.closable && <Toast.CloseTrigger />}
					</Toast.Root>
				)}
			</ChakraToaster>
		</Portal>
	);
};
