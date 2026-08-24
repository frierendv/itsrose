"use client";

import { FlowerOutline } from "@/components/common";
import { SidebarHeader } from "@/components/ui/sidebar";
import { config } from "@/shared/config";
import { cn } from "@itsrose/react/core";
import { memo } from "react";

export type SidebarBrandProps = {
	/** Additional className */
	className?: string;
};

export const SidebarBrand = memo<SidebarBrandProps>(({ className }) => {
	return (
		<SidebarHeader className={className}>
			<div className="flex items-center gap-2 px-1 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
				<FlowerOutline size={28} className="shrink-0" />

				<span
					className={cn(
						"text-foreground text-base font-bold truncate select-none",
						"group-data-[collapsible=icon]:hidden"
					)}
					data-sidebar="label"
				>
					{config.APP_TITLE}
				</span>
			</div>
		</SidebarHeader>
	);
});

SidebarBrand.displayName = "SidebarBrand";
