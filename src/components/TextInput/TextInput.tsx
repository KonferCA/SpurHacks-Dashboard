import { Field, Input, InputProps } from "@chakra-ui/react";
import type React from "react";

export interface TextInputProps extends InputProps {
	/**
	 * Label text of the input. For accessibility reasons, all inputs should have a label.
	 */
	label: string;

	/**
	 * Make input label screen-reader only. Default false.
	 */
	srLabel?: boolean;

	/**
	 * Description of the input field.
	 */
	description?: string;

	/**
	 * Function to validate the input value.
	 */
	validate?: (value: string) => boolean;
	id?: string;
	error?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
	label,
	description,
	required,
	error,
	...props
}) => {
	return (
		<Field.Root required={required} invalid={!!error}>
			<Field.Label>
				{label}
				{required && <Field.RequiredIndicator />}
			</Field.Label>
			<Input
				color="offwhite.primary"
				focusRing="none"
				bg="#1f1e2e"
				borderColor="transparent"
				borderRadius="full"
				_selection={{
					background: "#666484",
				}}
				_placeholder={{ color: "#666484" }}
				size="xl"
				{...props}
			/>
			<Field.HelperText>{description}</Field.HelperText>
			<Field.ErrorText>{error}</Field.ErrorText>
		</Field.Root>
	);
};
