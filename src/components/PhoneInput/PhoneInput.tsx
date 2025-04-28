import { FC, useState } from "react";
import {
    getTextInputLabelStyles,
    getTextInputStyles,
} from "../TextInput/TextInput.styles";

export interface PhoneInputProps {
    onChange: (phone: string) => void; // concat the country code + phone number
    required?: boolean;
}

export const PhoneInput: FC<PhoneInputProps> = ({ onChange, required }) => {
    const [randomId] = useState(Math.random().toString(32));

    return (
        <div className="grid grid-cols-6 space-y-2">
            <label
                className={getTextInputLabelStyles({
                    className: "col-span-full",
                })}
                htmlFor={`phone-${randomId}`}
            >
                Phone Number
                {required && <span className="text-red-600 ml-1">*</span>}
            </label>
            <div className="col-span-full">
                <input
                    id={`phone-${randomId}`}
                    className={getTextInputStyles({
                        className: "py-2 leading-5",
                    })}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="+1 999-999-9999"
                />
            </div>
        </div>
    );
};
