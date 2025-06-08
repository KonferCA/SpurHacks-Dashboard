import { Select } from "@/components/Select/Select";
import { TextInput } from "@/components/TextInput/TextInput";
import { countryCodes } from "@/data/countryPhoneCodes";
import { Fieldset, GridItem, SimpleGrid } from "@chakra-ui/react";
import type { FC } from "react";

// Function to format phone number to 123-444-5555 format
const formatPhoneNumber = (value: string) => {
	// Remove all non-digit characters
	const digits = value.replace(/\D/g, "");

	// Apply the format based on the number of digits
	if (digits.length <= 3) {
		return digits;
	} else if (digits.length <= 6) {
		return `${digits.slice(0, 3)}-${digits.slice(3)}`;
	} else {
		return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
	}
};

// Parse initial value or controlled value
const parsePhoneValue = (phoneValue?: string) => {
	if (!phoneValue) return { country: "Canada (+1)", number: "" };

	const match = phoneValue.match(/\(\+(\d+[-\d]*)\)\s*(.*)/);
	if (match) {
		const countryCode = match[1];
		const phone = match[2];
		// Find the country by code
		const foundCountry = countryCodes.find((c) =>
			c.includes(`(+${countryCode})`),
		);
		return {
			country: foundCountry || "Canada (+1)",
			number: phone || "",
		};
	}
	return { country: "Canada (+1)", number: "" };
};

export interface PhoneInputProps {
	onChange: (phone: { country: string; number: string }) => void; // concat the country code + phone number
	required?: boolean;
	error?: string;
	description?: string;
	disabled?: boolean;
	value:
		| {
				country: string;
				number: string;
		  }
		| string; // Controlled component value
}

export const PhoneInput: FC<PhoneInputProps> = ({
	onChange,
	required,
	error,
	description,
	disabled,
	value,
}) => {
	const { country, number } =
		typeof value === "string" ? parsePhoneValue(value) : value;

	const handleCountryChange = (value: string) => {
		onChange({ country: value, number: formatPhoneNumber(number) });
	};

	const handlePhoneChange = (value: string) => {
		// Remove all non-digits first
		const digitsOnly = value.replace(/\D/g, "");

		// Limit to 10 digits
		if (digitsOnly.length <= 10) {
			// Format the input
			const formatted = formatPhoneNumber(digitsOnly);
			onChange({ country, number: formatted });
		}
	};

	return (
		<Fieldset.Root invalid={!!error}>
			<SimpleGrid columns={12} gap={4}>
				<GridItem colSpan={{ base: 12, md: 4 }}>
					<Select
						value={{ value: country, label: country }}
						label="Country Code"
						placeholder="Select country code"
						required={required}
						options={countryCodes}
						onChange={(v) => handleCountryChange(v[0] ?? countryCodes[0])}
						disabled={disabled}
					/>
				</GridItem>
				<GridItem colSpan={{ base: 12, md: 8 }}>
					<TextInput
						required={required}
						value={number}
						onChange={(e) => handlePhoneChange(e.target.value)}
						placeholder="123-456-7890"
						label="Phone Number"
						maxLength={12} // 10 digits + 2 hyphens
						disabled={disabled}
					/>
				</GridItem>
			</SimpleGrid>
			{description && <Fieldset.HelperText>{description}</Fieldset.HelperText>}
			{error && <Fieldset.ErrorText>{error}</Fieldset.ErrorText>}
		</Fieldset.Root>
	);
};
