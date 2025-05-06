import { useDebounce } from "@/hooks/use-debounce";
import { Icon } from "@chakra-ui/react";
import { Combobox, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { CaretDown } from "@phosphor-icons/react";
import { FC, Fragment, useCallback, useRef, useState } from "react";
import { OptionType } from "./Select/Select";

interface SelectedListProps {
	options: OptionType[];
	onDelete: (option: string) => void;
}

const SelectedList: FC<SelectedListProps> = ({ options, onDelete }) => {
	return (
		<div className="selected-list">
			{options.length > 0 &&
				options.map((sel) => (
					<span key={`${sel.value}-selected`} className="selected-item">
						{sel.label}
						<button
							type="button"
							onClick={() => onDelete(sel.value)}
							className="remove-button"
						>
							<span className="sr-only">Remove</span>
							<XMarkIcon className="remove-icon" />
						</button>
					</span>
				))}
		</div>
	);
};

export interface MultiSelectProps {
	options: string[] | readonly string[];
	value?: OptionType[];
	allowCustomValue?: boolean;
	name?: string;
	disabled?: boolean;
	placeholder?: string;
	onChange?: (opts: string[]) => void;
}

export const MultiSelect: FC<MultiSelectProps> = ({
	options,
	value = [],
	allowCustomValue = false,
	name,
	disabled,
	placeholder,
	onChange,
}) => {
	const [controlledOptions, setControlledOptions] = useState(
		options.slice(0, 50),
	);
	const [query, setQuery] = useState("");
	const randomId = useRef(Math.random().toString(32));
	const comboboxButtonRef = useRef<HTMLButtonElement | null>(null);
	const lastOptionRef = useRef<HTMLLIElement | null>(null);
	const optionsRef = useRef<HTMLUListElement | null>(null);

	const handleChange = useCallback(
		(opts: string[]) => {
			setQuery("");
			if (onChange) onChange(opts);
		},
		[onChange, query],
	);

	const filterQuery = (value: string) => {
		const transformedValue = value.toLowerCase().trim();
		setControlledOptions(() =>
			value === ""
				? options.slice(0, 50)
				: options
						.filter((opt) =>
							opt.toLowerCase().trim().includes(transformedValue),
						)
						.slice(0, 50),
		);
	};

	//@ts-ignore
	const debounce = useDebounce(filterQuery, 400);

	const handleScroll = useCallback(() => {
		// already render the entire list
		if (controlledOptions.length === options.length) return;
		if (!optionsRef.current) return;
		const rect = optionsRef.current.getBoundingClientRect();
		const a = rect.top; // parent container top
		const b = rect.bottom; // parent container bottom
		if (lastOptionRef.current) {
			const rect = lastOptionRef.current.getBoundingClientRect();
			const x = rect.top; // last option top corner

			if (x >= a && x <= b) {
				// if in view load more options
				setControlledOptions((opts) => options.slice(0, opts.length + 50));
			}
		}
	}, [optionsRef.current, lastOptionRef.current]);

	const controlledoptions =
		query === ""
			? options
			: options.filter((opt) => {
					return opt.toLowerCase().trim().includes(query.toLowerCase().trim());
				});

	return (
		<>
			{value.length > 0 && (
				<SelectedList
					options={value}
					onDelete={(toBeDeleted) => {
						if (onChange)
							onChange(
								value
									.filter((opt) => opt.value !== toBeDeleted)
									.map((opt) => opt.value),
							);
					}}
				/>
			)}
			<Combobox
				disabled={disabled}
				name={name}
				value={value.map((opt) => opt.value)}
				onChange={handleChange}
				multiple
			>
				<div className="multiselect-container">
					<div className="combobox-input-container">
						<Combobox.Input
							placeholder={placeholder}
							id={randomId.current}
							className="combobox-input"
							onChange={(e) => {
								setQuery(e.target.value);
								debounce(e.target.value);
							}}
							onFocus={() => setQuery("")}
							onClick={() => comboboxButtonRef.current?.click()} // Added to handle click and focus event to open the combobox
							value={query}
						/>
						<Combobox.Button
							ref={comboboxButtonRef}
							className="combobox-button"
						>
							<Icon
								size="md"
								margin="0.5rem"
								marginRight="1rem"
								color="offwhite.primary"
							>
								<CaretDown aria-hidden="true" />
							</Icon>
						</Combobox.Button>
						<Transition
							as={Fragment}
							leave="transition-opacity"
							leaveFrom="opacity-100"
							leaveTo="opacity-0"
							afterLeave={() => setQuery("")}
						>
							<Combobox.Options
								ref={optionsRef}
								onScroll={handleScroll}
								className="options-container"
							>
								{allowCustomValue && query.length > 0 ? (
									<Combobox.Option
										className="option-item"
										value={query}
									>{`Create "${query}"`}</Combobox.Option>
								) : null}
								{controlledoptions.length === 0 && query !== "" ? (
									<div className="no-results">Nothing found.</div>
								) : (
									controlledoptions.map((opt, i) => (
										<Combobox.Option
											key={opt}
											className={({ active }) =>
												active ? "option-item option-active" : "option-item"
											}
											value={opt}
											ref={
												i === controlledOptions.length - 1
													? lastOptionRef
													: undefined
											}
										>
											{({ selected }) => (
												<span
													className={
														selected ? "option-text-selected" : "option-text"
													}
												>
													{opt}
												</span>
											)}
										</Combobox.Option>
									))
								)}
							</Combobox.Options>
						</Transition>
					</div>
				</div>
			</Combobox>
		</>
	);
};
