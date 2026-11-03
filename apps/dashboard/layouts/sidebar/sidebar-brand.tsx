"use client";

import { config } from "@/config";
import { Chip } from "@heroui/react";
import { Typography } from "@heroui/react/typography";
import { cn } from "@itsrose/react/core";
import { Icon } from "@itsrose/react/itsrose";

export const SidebarBrand: React.FC = () => {
	return (
		<div className="flex items-center gap-2.5 px-1 py-1.5 group-data-[collapsible=icon]:justify-center">
			<Icon size={28} className="shrink-0" />

			<div
				className={cn(
					"flex flex-col min-w-0 group-data-[collapsible=icon]:hidden",
					"transition-opacity duration-200"
				)}
			>
				<div className="flex items-center gap-1.5">
					<Typography
						type="h1"
						className="text-foreground text-sm font-semibold truncate select-none leading-none"
						data-sidebar="label"
					>
						{config.APP_TITLE}
					</Typography>
					<Chip
						size="sm"
						variant="soft"
						color="default"
						className="h-4 px-1 text-[10px] font-medium leading-none shrink-0"
					>
						v1.0
					</Chip>
				</div>
				<span className="text-[11px] text-muted truncate select-none mt-0.5">
					Console
				</span>
			</div>
		</div>
	);
};

SidebarBrand.displayName = "SidebarBrand";
