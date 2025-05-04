import { countryCodes } from "@/data/countryPhoneCodes";
import { type FC, useEffect, useState } from "react";
import { Select } from "@/components/Select/Select";
import { TextInput } from "@/components/TextInput/TextInput";
import { GridItem, SimpleGrid } from "@chakra-ui/react";

export interface PhoneInputProps {
	onChange: (phone: string) => void; // concat the country code + phone number
	required?: boolean;
}

export const PhoneInput: FC<PhoneInputProps> = ({ onChange, required }) => {
	const [country, setCountry] = useState("Canada (+1)");
	const [phone, setPhone] = useState("");

	const handleChange = (code: boolean, value: string) => {
		if (code) {
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
		<SimpleGrid columns={12} gap={4}>
			<GridItem colSpan={3}>
				<Select
					label="Country Code"
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
	);
};
