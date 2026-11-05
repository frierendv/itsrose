"use client";

import { Label, ListBox, Select } from "@heroui/react";

export type AdminSelectOption = {
	id: string;
	label: string;
};

export type AdminSelectProps = {
	"aria-label": string;
	label: string;
	value: string;
	options: readonly AdminSelectOption[];
	onChange: (value: string) => void;
	className?: string;
};

/**
 * Compact labelled select used by the admin list filters.
 */
export const AdminSelect: React.FC<AdminSelectProps> = ({
	"aria-label": ariaLabel,
	label,
	value,
	options,
	onChange,
	className = "w-full sm:w-48",
}) => (
	<Select
		aria-label={ariaLabel}
		className={className}
		onChange={(key) => onChange(String(key))}
		selectionMode="single"
		value={value}
	>
		<Label>{label}</Label>
		<Select.Trigger>
			<Select.Value />
			<Select.Indicator />
		</Select.Trigger>
		<Select.Popover>
			<ListBox items={options}>
				{(item) => (
					<ListBox.Item id={item.id} textValue={item.label}>
						{item.label}
						<ListBox.ItemIndicator />
					</ListBox.Item>
				)}
			</ListBox>
		</Select.Popover>
	</Select>
);

AdminSelect.displayName = "AdminSelect";
