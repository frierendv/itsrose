"use client";

import { AnimatedText } from "@/components/common";
import { ThemeSwitch } from "@/components/theme-switch";
import { config } from "@/config";
import { BrandIcon } from "@itsrose/react/itsrose";
import type { PropsWithChildren } from "react";

export const AuthLayout: React.FC<PropsWithChildren> = ({ children }) => (
	<div className="flex flex-col shrink-0">
		<div className="grid min-h-svh lg:grid-cols-2">
			{/* left */}
			<div className="flex flex-col gap-4 p-6 md:p-10" data-layout="left">
				{/* top ? */}
				<div className="flex justify-center gap-2 md:justify-start">
					<div className="flex items-center gap-1 font-medium">
						<BrandIcon size={32} />
						{config.APP_TITLE}
					</div>
				</div>
				{/* should be centered */}
				<div className="flex md:flex-1 items-center justify-center z-20">
					{children}
				</div>
			</div>
			{/* right */}
			<div className="relative hidden lg:block" data-layout="right">
				<AnimatedText className="py-2">
					{config.APP_DESCRIPTION}
				</AnimatedText>
			</div>
		</div>

		{/* Flaoting docked */}
		<div
			className="overflow-hidden fixed z-10 flex-1 bottom-2 right-2"
			role="toolbar"
			id="__docked_theme-switch"
		>
			<ThemeSwitch />
		</div>
	</div>
);

AuthLayout.displayName = "AuthLayout";
