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

	error?: string;
}

export type TextAreaProps = Props & TextareaProps;

export const TextArea: React.FC<TextAreaProps> = ({
	label,
	className,
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
			<Textarea
				focusRing="none"
				bg="#1f1e2e"
				borderColor="transparent"
				_selection={{
					background: "#666484",
				}}
				_placeholder={{ color: "#666484" }}
				size="xl"
				rounded="1.5rem"
				{...props}
			/>
			<Field.HelperText>{description}</Field.HelperText>
			<Field.ErrorText>{error}</Field.ErrorText>
		</Field.Root>
	);
};
