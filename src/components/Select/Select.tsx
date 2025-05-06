import type { FC } from "react";
import { useCallback, useMemo } from "react";
import SelectComponent from "react-select";
import { components } from "react-select";
import type { MenuListProps, OptionProps, GroupBase } from "react-select";
import { FixedSizeList } from "react-window";
import { Field } from "@chakra-ui/react";
import type { StylesConfig } from "react-select";
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

const OPTION_HEIGHT = 40; // height of each option in px

// custom component for rendering individual options within the virtualized list
const VirtualizedOption = ({
	children,
	...props
}: OptionProps<OptionType, boolean, GroupBase<OptionType>>) => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { onMouseMove, onMouseOver, ...rest } = props.innerProps;
	const newProps = { ...props, innerProps: rest };
	return (
		// use react-select's built-in Option component for consistent styling/behavior
		<components.Option {...newProps}>{children}</components.Option>
	);
};

// custom component for the virtualized menu list container
const MenuList = (
	props: MenuListProps<OptionType, boolean, GroupBase<OptionType>>,
) => {
	const { options, children, maxHeight, getValue } = props;
	const [value] = getValue();
	const initialOffset =
		options.indexOf(value) !== -1 ? options.indexOf(value) * OPTION_HEIGHT : 0;

	// ensure children is always an array for FixedSizeList
	const childrenArray = Array.isArray(children) ? children : [children];

	// calculate the list height based on options, capping at max height
	const listHeight = Math.min(maxHeight, childrenArray.length * OPTION_HEIGHT);

	// only return FixedSizeList if there are options
	if (!childrenArray.length) {
		return null; // or return the default no options message if needed
	}

	return (
		<FixedSizeList
			height={listHeight}
			itemCount={childrenArray.length}
			itemSize={OPTION_HEIGHT}
			initialScrollOffset={initialOffset}
			width="100%"
		>
			{({ index, style }) => (
				// clone the option element and apply the style from react-window
				<div style={style}>{childrenArray[index]}</div>
			)}
		</FixedSizeList>
	);
};

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

	// style config to mimic chakra/previous look - sorry if you're maintaing this
	const customStyles: StylesConfig<OptionType, typeof multiple> = useMemo(
		() => ({
			container: (provided) => ({
				...provided,
				width: "100%", // set width on the root container
			}),
			control: (provided, state) => ({
				...provided,
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
						? "#1F1E2E" // hover color
						: "transparent",
				color: state.isSelected ? "#666484" : "##DEEBFF",
				padding: "8px 12px",
				cursor: "pointer",
				"&:active": {
					backgroundColor: state.isSelected ? "orange.500" : "#1A1926",
				},
				"&:hover": {
					backgroundColor: "#333147",
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
		components: {
			MenuList: typeof MenuList;
			Option: typeof VirtualizedOption;
		};
		isClearable: boolean;
		"aria-label": typeof label;
		inputId: typeof label;
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
		components: {
			MenuList,
			Option: VirtualizedOption,
		},
		isClearable: true, // allow clearing selection
		"aria-label": label, // accessibility
		inputId: label, // link label to input for accessibility
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
			<Field.Label>
				{label}
				{required && <Field.RequiredIndicator />}
			</Field.Label>

			{multiple && (
				<MultiSelect
					value={Array.isArray(value) ? value : []}
					options={initialOptions}
					disabled={disabled}
					allowCustomValue={allowCustomValue}
					onChange={onChange}
				/>
			)}

			{!multiple && (
				<SelectComponent<OptionType, boolean, GroupBase<OptionType>>
					{...commonSelectProps}
					// message when no options match search
					noOptionsMessage={() => "No options found"}
				/>
			)}

			<Field.HelperText>{description}</Field.HelperText>
			<Field.ErrorText>{error}</Field.ErrorText>
		</Field.Root>
	);
};
