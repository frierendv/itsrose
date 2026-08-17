"use client";

import { AuthContainer, ContentLeft, ContentRight } from "@/components/auth";
import { AnimatedText, Logo } from "@/components/common";
import { ThemeSwitch } from "@/components/theme-switch";
import { config } from "@/shared/config";
import { memo, type PropsWithChildren } from "react";
import { BaseLayout } from "./base";

export const AuthLayout = memo<PropsWithChildren>(({ children }) => (
	<BaseLayout>
		<AuthContainer>
			<ContentLeft>
				<div className="flex justify-center gap-2 md:justify-start">
					<div className="flex items-center gap-2 font-medium">
						<Logo />
						{config.APP_TITLE}
					</div>
				</div>
				<div className="flex flex-1 items-center justify-center z-20">
					{children}
				</div>
			</ContentLeft>
			<ContentRight>
				<AnimatedText className="py-2">
					{config.APP_DESCRIPTION}
				</AnimatedText>
			</ContentRight>
		</AuthContainer>
		<ThemeSwitch />
	</BaseLayout>
));

AuthLayout.displayName = "Layout.Auth";
