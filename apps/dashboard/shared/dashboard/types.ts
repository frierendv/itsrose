import type { ComponentType } from "react";
import type { TPath } from "../utils";

export type SidebarSubItem = {
	title: string;
	url: TPath;
	isExternal?: boolean;
	icon?: ComponentType<{ className?: string }>;
};

export type SidebarItem = SidebarSubItem & {
	items?: SidebarSubItem[];
};

export type SidebarItemProps = {
	items: SidebarItem[];
	label?: string;
};
