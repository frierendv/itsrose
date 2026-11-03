import type { ComponentType } from "react";

export type SidebarItem = {
	title: string;
	url: `/${string}` | `https://${string}` | `http://${string}`;
	icon?: ComponentType<{ className?: string }>;
	isExternal?: boolean;

	// optional badge and badgeColor
	badge?: string | number;
	// badgeColor matches the provided Color type from used component
	badgeColor?:
		"primary" | "secondary" | "success" | "warning" | "danger" | "default";

	isDisabled?: boolean;
	items?: SidebarItem[];
};

export type SidebarNavGroup = {
	title?: string;
	items: SidebarItem[];
};

export type SidebarItemProps = {
	items: SidebarItem[];
	label?: string;
};

// Backwards compatibility alias for recursive items
export type SidebarSubItem = SidebarItem;
