import type React from "react";
import { Field, Input, InputProps } from "@chakra-ui/react";

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
	invalid?: boolean;
	id?: string;
	error?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
	label,
	invalid,
	description,
	required,
	error,
	...props
}) => {
	return (
		<Field.Root required={required} invalid={invalid}>
			<Field.Label>
				{label}
				{required && <Field.RequiredIndicator />}
			</Field.Label>
			<Input bg="black" {...props} />
			<Field.HelperText>{description}</Field.HelperText>
			<Field.ErrorText>{error}</Field.ErrorText>
		</Field.Root>
	);
};
