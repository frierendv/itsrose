import type { ComponentType } from "react";

export type SubItem = {
	title: string;
	url: string;
};

export type MainItem = {
	title: string;
	url: string;
	icon: ComponentType<{ className?: string }>;
	isActive?: boolean;
	isExpanded?: boolean;
	items?: SubItem[];
};

export type NavMainProps = {
	items: MainItem[];
	label?: string;
};
