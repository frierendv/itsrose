"use client";

import { cn, forwardRef } from "@/shared/utils";
import Circles4Diamond from "@gravity-ui/icons/Circles4Diamond";
import { Popover, Separator } from "@heroui/react";
import { Button } from "@heroui/react/button";
import { useEffect, useState } from "react";
import { WebProgressSetting } from "./progress-setting";
import { WebSettingTheme } from "./theme-setting";
import { WebSettingThemeSwitch } from "./theme-switch-setting";
import { WebToastSetting } from "./toast-setting";

export const WebSettings = forwardRef<"div">(({ className, ...props }, ref) => {
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);
	if (!mounted) {
		return null;
	}

	return (
		<div
			ref={ref}
			className={cn(
				"overflow-hidden fixed z-10 flex-1 bottom-2 right-3",
				className
			)}
			role="toolbar"
			{...props}
			id="__docked-web-settings"
		>
			<Popover>
				<Popover.Trigger>
					<Button
						size="lg"
						isIconOnly
						variant="outline"
						aria-label="ItsRose web feature settings"
					>
						<Circles4Diamond className="size-4" />
						<span className="sr-only">
							Toggle web feature settings
						</span>
					</Button>
				</Popover.Trigger>
				<Popover.Content
					shouldFlip
					shouldUpdatePosition
					placement="top left"
					className="min-w-64! max-h-[70vh]! overflow-y-auto"
				>
					<Popover.Dialog>
						<Popover.Heading>Theme</Popover.Heading>
						<WebSettingTheme />
					</Popover.Dialog>

					<Separator />

					<Popover.Dialog>
						<Popover.Heading>Theme switching</Popover.Heading>
						<WebSettingThemeSwitch />
					</Popover.Dialog>

					<Separator />

					<Popover.Dialog>
						<Popover.Heading>Toast</Popover.Heading>
						<WebToastSetting />
					</Popover.Dialog>

					<Separator />

					<Popover.Dialog>
						<Popover.Heading>Bprogress</Popover.Heading>
						<WebProgressSetting />
					</Popover.Dialog>
				</Popover.Content>
			</Popover>
		</div>
	);
});
