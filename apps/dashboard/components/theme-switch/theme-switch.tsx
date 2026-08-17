"use client";

import { cn, forwardRef } from "@/shared/utils";
import type { ButtonRootProps } from "@heroui/react/button";
import { ThemeSwitchBase } from "./theme-switch-base";

export const ThemeSwitch = forwardRef<"div", ButtonRootProps>(
	({ className, ...props }, ref) => (
		<div
			className="overflow-hidden fixed z-10 flex-1 bottom-2 right-2"
			role="toolbar"
			id="__docked_theme-switch"
			ref={ref}
		>
			<ThemeSwitchBase
				isIconOnly
				variant="outline"
				className={cn("rounded-full", className)}
				{...props}
			/>
		</div>
	)
);

ThemeSwitch.displayName = "ThemeSwitch";
