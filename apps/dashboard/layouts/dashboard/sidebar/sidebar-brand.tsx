"use client";

import { FlowerOutline } from "@/components/common";
import { config } from "@/config";
import { Typography } from "@heroui/react/typography";
import { cn } from "@itsrose/react/core";
import { memo } from "react";

export const SidebarBrand = memo(() => {
	return (
		<div className="flex items-center gap-2 px-1 py-1 group-data-[collapsible=icon]:justify-center">
			<FlowerOutline size={28} className="shrink-0" />

			<Typography
				type="h1"
				className={cn(
					"text-foreground text-base font-bold truncate select-none",
					"group-data-[collapsible=icon]:hidden"
				)}
				data-sidebar="label"
			>
				{config.APP_TITLE}
			</Typography>
		</div>
	);
});

SidebarBrand.displayName = "SidebarBrand";
