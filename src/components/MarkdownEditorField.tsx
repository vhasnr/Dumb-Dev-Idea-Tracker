import { useRef, useState } from 'react';
import { Button, FormField, SpaceBetween } from '@cloudscape-design/components';
import MDEditor from '@uiw/react-md-editor';

type MarkdownEditorFieldProps = {
  label: string;
  description?: string;
  value: string;
  onChange: (nextValue: string) => void;
  onUploadImage: (file: File) => Promise<string>;
  onUploadError?: (message: string) => void;
  placeholder: string;
  disabled?: boolean;
  errorText?: string;
};

export function MarkdownEditorField({
  label,
  description,
  value,
  onChange,
  onUploadImage,
  onUploadError,
  placeholder,
  disabled = false,
  errorText,
}: MarkdownEditorFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';
    if (!selectedFile) {
      return;
    }

    setIsUploading(true);
    try {
      const imageReference = await onUploadImage(selectedFile);
      const nextValue = value.trim().length
        ? `${value}\n\n![${selectedFile.name}](${imageReference})`
        : `![${selectedFile.name}](${imageReference})`;
      onChange(nextValue);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image upload failed.';
      onUploadError?.(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <FormField label={label} description={description} errorText={errorText}>
      <SpaceBetween size="xs">
        <div data-color-mode="dark">
          <MDEditor
            value={value}
            onChange={(next) => onChange(next ?? '')}
            preview="live"
            visibleDragbar={false}
            height={260}
            textareaProps={{
              placeholder,
              disabled,
            }}
          />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
          disabled={disabled || isUploading}
        />
        <Button
          iconName="upload"
          loading={isUploading}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Upload image
        </Button>
      </SpaceBetween>
    </FormField>
  );
}
