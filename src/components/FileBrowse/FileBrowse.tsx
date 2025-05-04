import type React from "react";
import { Field, FileUpload, FileUploadRootProps } from "@chakra-ui/react";
import { Button } from "@chakra-ui/react";

export interface FileBrowserProps
	extends Omit<FileUploadRootProps, "onChange"> {
	label: string;
	inputId?: string;
	description?: string;
	subdescription?: string;
	required?: boolean;
	onChange?: (files: File[]) => void;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
	label,
	maxFiles = 1,
	accept = ["image/*", "video/*"],
	required,
	onChange,
}) => {
	return (
		<Field.Root required={required}>
			<FileUpload.Root
				required={required}
				maxFiles={maxFiles}
				accept={accept}
				onFileAccept={(details) => {
					if (onChange) onChange(details.files);
				}}
			>
				<Field.Label>
					{label}
					{required && <Field.RequiredIndicator />}
				</Field.Label>
				<FileUpload.HiddenInput />
				<FileUpload.Trigger asChild>
					<Button variant="outline" size="sm" width="full">
						Select File(s)
					</Button>
				</FileUpload.Trigger>
				<FileUpload.ItemGroup>
					<FileUpload.Context>
						{({ acceptedFiles }) =>
							acceptedFiles.map((file) => (
								<FileUpload.Item key={file.name} file={file}>
									<FileUpload.ItemPreview />
									<FileUpload.ItemName />
									<FileUpload.ItemSizeText />
									<FileUpload.ItemDeleteTrigger />
								</FileUpload.Item>
							))
						}
					</FileUpload.Context>
				</FileUpload.ItemGroup>
			</FileUpload.Root>
		</Field.Root>
	);
};
