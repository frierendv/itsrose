"use client";

import { AuthProvider } from "@/client/providers/auth";
import { AnimatedText, FlowerOutline } from "@/components/common";
import { BaseLayout } from "@/components/layout";
import { ThemeSwitch } from "@/components/theme-switch";
import { config } from "@/shared/config";
import { memo, type PropsWithChildren } from "react";

export const AuthLayout = memo<PropsWithChildren>(({ children }) => (
	<AuthProvider>
		<BaseLayout>
			<div className="grid min-h-svh lg:grid-cols-2">
				{/* left */}
				<div
					className="flex flex-col gap-4 p-6 md:p-10"
					data-layout="left"
				>
					{/* top ? */}
					<div className="flex justify-center gap-2 md:justify-start">
						<div className="flex items-center gap-1 font-medium">
							<FlowerOutline size={32} />
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
			<ThemeSwitch />
		</BaseLayout>
	</AuthProvider>
));

AuthLayout.displayName = "AuthLayout";
