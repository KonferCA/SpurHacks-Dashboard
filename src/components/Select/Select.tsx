import type { FC } from "react";
import { useCallback, useMemo } from "react";
import CreatableSelect from "react-select/creatable";
import SelectComponent from "react-select";
import type { GroupBase, StylesConfig } from "react-select";
import { Field } from "@chakra-ui/react";
import { MultiSelect } from "../MultiSelect";

// define the shape react-select expects for options
export interface OptionType {
	value: string;
	label: string;
}

export interface SelectProps {
	label: string;
	options: string[] | readonly string[];
	allowCustomValue?: boolean;
	disabled?: boolean;
	required?: boolean;
	description?: string;
	multiple?: boolean;
	placeholder?: string;
	error?: string;
	value?: OptionType | OptionType[];
	onChange?: (selected: string[]) => void;
	// width prop is handled by the wrapping Field.Root now??
}

// helper to convert string array to OptionType array
const mapOptions = (options: string[] | readonly string[]): OptionType[] =>
	options.map((opt) => ({ value: opt, label: opt }));

const MENU_MAX_HEIGHT = 200; // max height of the dropdown menu in px



export const Select: FC<SelectProps> = ({
	label,
	options: initialOptions,
	required,
	disabled,
	description,
	value,
	multiple = false,
	placeholder,
	error,
	onChange,
	allowCustomValue = false,
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
	// function to display the create option prompt
	const formatCreateLabel = useCallback(
		(inputValue: string) => `Create "${inputValue}"`,
		[],
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
				color: "#DEEBFF",
				backgroundColor: "#1f1e2e",
				borderColor: "transparent",
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
				color: "#666484",
			}),
			input: (provided) => ({
				...provided,
				color: "#DEEBFF",
				margin: 0,
				padding: 0,
			}),
			singleValue: (provided) => ({
				...provided,
				color: "#DEEBFF",
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
				backgroundColor: "#1f1e2e",
				borderRadius: "1.5rem", // xl
				zIndex: 2, // ensure menu is above other elements
				overflow: "hidden",
			}),
			menuList: (provided) => ({
				...provided,
				paddingTop: "4px",
				paddingBottom: "4px",
			}),
			option: (provided, state) => ({
				...provided,
				backgroundColor: state.isSelected
					? "transparent"
					: state.isFocused
						? "#1F1E2E"
						: "transparent",
				color: state.isSelected ? "#666484" : "#DEEBFF",
				padding: "8px 12px",
				cursor: "pointer",
				whiteSpace: "normal",
				wordBreak: "break-word",
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

	// common props for both select components
	type CommonSelectProps = {
		options: typeof mappedOptions;
		onChange: typeof handleChange;
		value: typeof value;
		isMulti: typeof multiple;
		isDisabled: typeof disabled;
		placeholder: typeof placeholder;
		styles: typeof customStyles;
		isClearable: boolean;
		"aria-label": typeof label;
		inputId: typeof label;
		maxMenuHeight: number;
		closeMenuOnSelect: boolean;
	};

	const commonSelectProps: CommonSelectProps = {
		options: mappedOptions,
		onChange: handleChange,
		value: value,
		isMulti: multiple,
		isDisabled: disabled,
		placeholder: placeholder,
		styles: customStyles,
		isClearable: true, // allow clearing selection
		"aria-label": label, // accessibility
		inputId: label, // link label to input for accessibility
		maxMenuHeight: MENU_MAX_HEIGHT,
		closeMenuOnSelect: !multiple, // keep menu open for multi-select
	};

	return (
		// use Chakra Field for layout, labels, errors, and IMPORTANTLY width control
		<Field.Root
			required={required}
			invalid={!!error}
			disabled={disabled}
			width="100%"
		>
			<Field.Label color="offwhite.primary">
				{label}
				{required && <Field.RequiredIndicator />}
			</Field.Label>

			{multiple ? (
				<MultiSelect
					value={Array.isArray(value) ? value : []}
					options={initialOptions}
					disabled={disabled}
					allowCustomValue={allowCustomValue}
					onChange={onChange}
				/>
			) : allowCustomValue ? (
				<CreatableSelect<OptionType, boolean, GroupBase<OptionType>>
					{...commonSelectProps}
					// creatable props
					formatCreateLabel={formatCreateLabel}
					// message when no options match search
					noOptionsMessage={({ inputValue }) =>
						inputValue ? formatCreateLabel(inputValue) : "No options found"
					}
				/>
			) : (
				<SelectComponent<OptionType, boolean, GroupBase<OptionType>>
					{...commonSelectProps}
					// message when no options match search
					noOptionsMessage={() => "No options found"}
				/>
			)}

			<Field.HelperText color="offwhite.primary">
				{description}
			</Field.HelperText>
			<Field.ErrorText>{error}</Field.ErrorText>
		</Field.Root>
	);
};
