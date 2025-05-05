import { countryCodes } from "@/data/countryPhoneCodes";
import { type FC, useEffect, useState } from "react";
import { Select } from "@/components/Select/Select";
import { TextInput } from "@/components/TextInput/TextInput";
import { Fieldset, GridItem, SimpleGrid } from "@chakra-ui/react";

export interface PhoneInputProps {
	onChange: (phone: string) => void; // concat the country code + phone number
	required?: boolean;
	error?: string;
	description?: string;
	initialValue?: string;
}

export const PhoneInput: FC<PhoneInputProps> = ({
	onChange,
	required,
	error,
	description,
	initialValue,
}) => {
	const [country, setCountry] = useState(() => {
		if (initialValue) {
			// Value format should be like "(+1) 123-456-7890"
			const match = initialValue.match(/\(\+(\d+[-\d]*)\)\s*(.*)/);
			if (match) {
				const countryCode = match[1];
				// Find the country by code
				const foundCountry = countryCodes.find((c) =>
					c.includes(`(+${countryCode})`),
				);
				if (foundCountry) {
					return foundCountry;
				}
			}
		}
		return "Canada (+1)";
	});

	const [phone, setPhone] = useState(() => {
		if (initialValue) {
			// Value format should be like "(+1) 123-456-7890"
			const match = initialValue.match(/\(\+(\d+[-\d]*)\)\s*(.*)/);
			if (match) {
				const phone = match[2];
				if (phone) {
					return phone;
				}
			}
		}
		return "";
	});

	const handleChange = (code: boolean, value: string) => {
		if (code) {
			//@ts-ignore
			setCountry(value);
		} else {
			setPhone((old) => {
				if (/^[0-9-]*$/.test(value)) {
					return value;
				}
				return old;
			});
		}
	};

	useEffect(() => {
		if (onChange) {
			// If the phone number is empty, update as empty string for proper validation
			if (!phone) {
				onChange("");
				return;
			}
			const match = country.match(/\(\+(\d+[-\d]*)\)/);
			const code = match ? match[1] : "";
			onChange(`(+${code}) ${phone}`);
		}
	}, [country, phone, onChange]);

	return (
		<Fieldset.Root invalid={!!error}>
			<SimpleGrid columns={12} gap={4}>
				<GridItem colSpan={3}>
					<Select
						value={country ? { value: country, label: country } : undefined}
						label="Country Code"
						placeholder="Select country code"
						required={required}
						options={countryCodes}
						onChange={(v) => handleChange(true, v[0] ?? countryCodes[0])}
					/>
				</GridItem>
				<GridItem colSpan={9}>
					<TextInput
						required={required}
						value={phone}
						onChange={(e) => handleChange(false, e.target.value)}
						placeholder="999-999-9999"
						label="Phone Number"
					/>
				</GridItem>
			</SimpleGrid>
			{description && <Fieldset.HelperText>{description}</Fieldset.HelperText>}
			{error && <Fieldset.ErrorText>{error}</Fieldset.ErrorText>}
		</Fieldset.Root>
	);
};
