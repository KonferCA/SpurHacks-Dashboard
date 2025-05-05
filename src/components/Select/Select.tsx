import type { FC } from "react";
import { useCallback, useMemo } from "react";
import CreatableSelect from "react-select/creatable";
import { Field } from "@chakra-ui/react"; // keep field for layout/errors
import type { GroupBase, StylesConfig } from "react-select";

// define the shape react-select expects for options
interface OptionType {
	value: string;
	label: string;
}

export interface SelectProps {
	label: string;
	options: string[] | readonly string[];
	allowOther?: boolean; // allow creating new options
	disabled?: boolean;
	required?: boolean;
	description?: string;
	multiple?: boolean;
	placeholder?: string;
	error?: string;
	onChange?: (selected: string[]) => void;
	// width prop is handled by the wrapping Field.Root now?? 
}

// helper to convert string array to OptionType array
const mapOptions = (options: string[] | readonly string[]): OptionType[] =>
	options.map((opt) => ({ value: opt, label: opt }));

export const Select: FC<SelectProps> = ({
	label,
	options: initialOptions,
	required,
	disabled,
	description,
	multiple = false,
	placeholder,
	error,
	onChange,
	allowOther = false,
}) => {
	// memoize the options transformation
	const mappedOptions = useMemo(
		() => mapOptions(initialOptions),
		[initialOptions],
	);

	// use react-select's onChange to match the expected string[] signature
	const handleChange = useCallback(
		(selectedOption: unknown) => {
			if (!onChange) return;

			if (multiple) {
				// handle multiple selections
				const selected = selectedOption as OptionType[] | null;
				onChange(selected ? selected.map((opt) => opt.value) : []);
			} else {
				// handle single selection
				const selected = selectedOption as OptionType | null;
				onChange(selected ? [selected.value] : []);
			}
		},
		[onChange, multiple],
	);

	// style config to mimic chakra/previous look - sorry if you're maintaing this
	const customStyles: StylesConfig<OptionType, typeof multiple> = useMemo(
		() => ({
			container: (provided) => ({
				...provided,
				width: "100%", // set width on the root container
			}),
			control: (provided, state) => ({
				...provided,
				backgroundColor: "#333147",
				borderColor: state.isFocused ? "orange.400" : "transparent",
				borderRadius: "9999px", // full
				minHeight: "48px", // lg size
				boxShadow: state.isFocused ? "0 0 0 1px orange.400" : "none", // focus ring
				"&:hover": {
					borderColor: state.isFocused ? "orange.400" : "transparent",
				},
			}),
			valueContainer: (provided) => ({
				...provided,
				padding: "0 16px",
			}),
			placeholder: (provided) => ({
				...provided,
				color: "#666484", // gray.500 equivalent
			}),
			input: (provided) => ({
				...provided,
				color: "white",
				margin: 0,
				padding: 0,
			}),
			singleValue: (provided) => ({
				...provided,
				color: "white",
			}),
			multiValue: (provided) => ({
				...provided,
				backgroundColor: "rgba(255, 255, 255, 0.1)",
				borderRadius: "4px",
			}),
			multiValueLabel: (provided) => ({
				...provided,
				color: "white",
				padding: "2px 6px",
			}),
			multiValueRemove: (provided) => ({
				...provided,
				color: "#A0AEC0", // gray.400
				"&:hover": {
					backgroundColor: "rgba(255, 255, 255, 0.2)",
					color: "white",
				},
			}),
			menu: (provided) => ({
				...provided,
				backgroundColor: "#333147",
				borderRadius: "0.75rem", // xl
				zIndex: 2, // ensure menu is above other elements
			}),
			menuList: (provided) => ({
				...provided,
				paddingTop: "4px",
				paddingBottom: "4px",
			}),
			option: (provided, state) => ({
				...provided,
				backgroundColor: state.isSelected
					? "orange.400"
					: state.isFocused
						? "#1F1E2E" // hover color
						: "transparent",
				color: state.isSelected ? "#1A202C" : "white",
				borderRadius: "0.75rem", // xl
				margin: "0 4px",
				width: "calc(100% - 8px)",
				cursor: "pointer",
				"&:active": {
					backgroundColor: state.isSelected ? "orange.500" : "#1A1926",
				},
			}),
			indicatorSeparator: () => ({
				display: "none",
			}),
			dropdownIndicator: (provided) => ({
				...provided,
				color: "#A0AEC0", // gray.400
				"&:hover": {
					color: "white",
				},
			}),
			clearIndicator: (provided) => ({
				...provided,
				color: "#A0AEC0",
				"&:hover": {
					color: "white",
				},
			}),
			loadingIndicator: (provided) => ({
				...provided,
				color: "#A0AEC0",
			}),
			noOptionsMessage: (provided) => ({
				...provided,
				color: "#A0AEC0",
			}),
		}),
		[],
	);

	// function to display the create option prompt
	const formatCreateLabel = useCallback(
		(inputValue: string) => `Create "${inputValue}"`,
		[],
	);

	return (
		// use Chakra Field for layout, labels, errors, and IMPORTANTLY width control
		<Field.Root
			required={required}
			invalid={!!error}
			disabled={disabled}
			width="100%"
		>
			<Field.Label>{label}</Field.Label>
			<CreatableSelect<OptionType, typeof multiple, GroupBase<OptionType>>
				// core props
				options={mappedOptions}
				onChange={handleChange}
				isMulti={multiple}
				isDisabled={disabled}
				placeholder={placeholder}
				styles={customStyles}
				// creatable props
				formatCreateLabel={allowOther ? formatCreateLabel : undefined}
				// message when no options match search
				noOptionsMessage={({ inputValue }) =>
					allowOther && inputValue
						? formatCreateLabel(inputValue) // show create prompt if allowed
						: "No options found"
				}
				// control props
				isClearable // allow clearing selection
				aria-label={label} // accessibility
				inputId={label} // link label to input for accessibility
			/>
			<Field.HelperText>{description}</Field.HelperText>
			<Field.ErrorText>{error}</Field.ErrorText>
		</Field.Root>
	);
};
