import { useMemo } from "react";

export function useId(prefix = "id") {
	const _id = useMemo(() => {
		// Generate a random string (combination of timestamp and random numbers)
		const randomPart = Math.random().toString(36).substring(2, 10);
		const timestamp = Date.now().toString(36);

		// Combine prefix and random parts to create the final ID
		const generatedId = `${prefix}-${timestamp}-${randomPart}`;

		return generatedId;
	}, [prefix]);

	return _id;
}
