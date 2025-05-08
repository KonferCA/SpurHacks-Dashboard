import {
	Field,
	FileUpload,
	FileUploadRootProps,
	Spinner,
} from "@chakra-ui/react";
import { Button } from "@chakra-ui/react";
import type React from "react";

export interface FileBrowserProps
	extends Omit<FileUploadRootProps, "onChange"> {
	label: string;
	inputId?: string;
	description?: string;
	required?: boolean;
	error?: string;
	loading?: boolean; // if true, shows a spinning circle instead of "x"
	disabled?: boolean; // Locks adding/removing files
	onChange?: (files: File[]) => void;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
	label,
	maxFiles = 1,
	accept = ["image/*", "video/*"],
	required,
	error,
	disabled,
	loading,
	description,
	onChange,
}) => {
	return (
		<Field.Root required={required} invalid={!!error} disabled={disabled}>
			<FileUpload.Root
				required={required}
				maxFiles={maxFiles}
				accept={accept}
				onFileChange={(details) => {
					if (onChange) onChange(details.acceptedFiles);
				}}
			>
				<Field.Label color="offwhite.primary">
					{label}
					{required && <Field.RequiredIndicator />}
				</Field.Label>
				<FileUpload.HiddenInput />
				<FileUpload.Trigger asChild>
					<Button
						variant="outline"
						size="xl"
						width="full"
						color="offwhite.primary"
						border="none"
						background="#1f1e2e"
						rounded="full"
						_hover={{
							background: "#333147",
						}}
					>
						Select File(s)
					</Button>
				</FileUpload.Trigger>
				<FileUpload.ItemGroup>
					<FileUpload.Context>
						{({ acceptedFiles }) =>
							acceptedFiles.map((file) => (
								<FileUpload.Item
									key={file.name}
									file={file}
									background="#333147"
									rounded="full"
								>
									<FileUpload.ItemPreview />
									<FileUpload.ItemName color="offwhite.primary" />
									<FileUpload.ItemSizeText />
									{!disabled && !loading && <FileUpload.ItemDeleteTrigger />}
									{loading && <Spinner />}
								</FileUpload.Item>
							))
						}
					</FileUpload.Context>
				</FileUpload.ItemGroup>
			</FileUpload.Root>
			<Field.HelperText color="offwhite.primary">
				{description}
			</Field.HelperText>
			<Field.ErrorText>{error}</Field.ErrorText>
		</Field.Root>
	);
};
