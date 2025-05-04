import { Field, Textarea, type TextareaProps } from "@chakra-ui/react";

interface Props extends TextareaProps {
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

	invalid?: boolean;

	error?: string;
}

export type TextAreaProps = Props & TextareaProps;

export const TextArea: React.FC<TextAreaProps> = ({
	label,
	className,
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
			<Textarea
				bg="#333145"
				borderColor="transparent"
				borderRadius="full"
				_placeholder={{ color: "#666484" }}
				size="lg"
				{...props}
			/>
			<Field.HelperText>{description}</Field.HelperText>
			<Field.ErrorText>{error}</Field.ErrorText>
		</Field.Root>
	);
};
