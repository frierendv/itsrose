"use client";

import type { ButtonRootProps } from "@heroui/react/button";
import { cn, forwardRef } from "@itsrose/react/core";
import { ThemeSwitchBase } from "./theme-switch-base";

export const ThemeSwitch = forwardRef<"div", ButtonRootProps>(
	({ as: Component = "div", className, ...props }, ref) => (
		<Component
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
		</Component>
	)
);

ThemeSwitch.displayName = "ThemeSwitch";
