import {
	type FC,
	useCallback,
	useEffect,
	useRef,
	useState,
	useMemo,
} from "react";
import {
	Select as ChakraSelect,
	createListCollection,
	Field,
	SelectValueChangeDetails,
} from "@chakra-ui/react";

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
	onChange?: (selected: string[]) => void;
}

export const Select: FC<SelectProps> = ({
	label,
	options,
	required,
	disabled,
	description,
	multiple = false,
	placeholder,
	error,
	onChange,
}) => {
	const [visibleOptions, setVisibleOptions] = useState<string[]>([]);
	const contentRef = useRef<HTMLDivElement>(null);
	const lastOptionRef = useRef<HTMLDivElement>(null);

	// Initialize with first 50 options
	useEffect(() => {
		setVisibleOptions(options.slice(0, 50) as string[]);
	}, [options]);

	const handleChange = useCallback(
		(details: SelectValueChangeDetails<string>) => {
			if (onChange) onChange(details.value);
		},
		[onChange, multiple],
	);

	const handleScroll = useCallback(() => {
		// If already rendered all options
		if (visibleOptions.length >= options.length) return;

		if (!contentRef.current || !lastOptionRef.current) return;

		const containerRect = contentRef.current.getBoundingClientRect();
		const containerBottom = containerRect.bottom;

		const lastItemRect = lastOptionRef.current.getBoundingClientRect();
		const lastItemBottom = lastItemRect.bottom;

		// If the last visible item is near the bottom of the container, load more
		if (lastItemBottom <= containerBottom + 50) {
			setVisibleOptions(
				(prev) =>
					[
						...prev,
						...options.slice(prev.length, prev.length + 50),
					] as string[],
			);
		}
	}, [visibleOptions, options]);

	const collection = useMemo(() => {
		return createListCollection({
			items: options,
			itemToValue: (item) => item,
			itemToString: (item) => item,
		});
	}, [options]);

	return (
		<Field.Root required={required} invalid={!!error}>
			<ChakraSelect.Root
				collection={collection}
				onValueChange={handleChange}
				disabled={disabled}
				multiple={multiple}
				size="lg"
			>
				<ChakraSelect.Label>
					{label}
					{required && <Field.RequiredIndicator />}
				</ChakraSelect.Label>
				<ChakraSelect.HiddenSelect />
				<ChakraSelect.Control>
					<ChakraSelect.Trigger
						bg="#333147"
						borderColor="transparent"
						borderRadius="full"
						_placeholder={{ color: "#666484" }}
					>
						<ChakraSelect.ValueText placeholder={placeholder} />
					</ChakraSelect.Trigger>
					<ChakraSelect.IndicatorGroup>
						<ChakraSelect.Indicator />
						<ChakraSelect.ClearTrigger />
					</ChakraSelect.IndicatorGroup>
				</ChakraSelect.Control>
				<ChakraSelect.Positioner>
					<ChakraSelect.Content
						ref={contentRef}
						onScroll={handleScroll}
						bg="#333147"
						rounded="xl"
					>
						{visibleOptions.map((item, index) => (
							<ChakraSelect.Item
								_hover={{
									bg: "#1F1E2E",
								}}
								rounded="xl"
								item={item}
								key={item}
								ref={
									index === visibleOptions.length - 1
										? lastOptionRef
										: undefined
								}
							>
								{item}
								<ChakraSelect.ItemIndicator />
							</ChakraSelect.Item>
						))}
					</ChakraSelect.Content>
				</ChakraSelect.Positioner>
			</ChakraSelect.Root>

			<Field.HelperText>{description}</Field.HelperText>
			<Field.ErrorText>{error}</Field.ErrorText>
		</Field.Root>
	);
};
