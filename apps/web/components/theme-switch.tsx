"use client";

import Moon from "@gravity-ui/icons/Moon";
import Sun from "@gravity-ui/icons/Sun";
import { Button, type ButtonRootProps } from "@heroui/react/button";
import { useTheme } from "next-themes";
import { memo, useCallback, useEffect, useState } from "react";
import {
	ThemeAnimationType,
	useModeAnimation,
} from "react-theme-switch-animation";

export const ThemeSwitch = memo<ButtonRootProps>((props) => {
	const [mounted, setMounted] = useState<boolean>(false);
	const { resolvedTheme, setTheme } = useTheme();

	useEffect(() => setMounted(true), []);

	const isDarkMode = resolvedTheme === "dark";
	const onDarkModeChange = useCallback(
		(isDark: boolean) => setTheme(isDark ? "dark" : "light"),
		[setTheme]
	);
	const { ref: buttonRef, toggleSwitchTheme } = useModeAnimation({
		animationType: ThemeAnimationType.POLYGON,
		isDarkMode,
		onDarkModeChange,
	});

	if (!mounted) {
		return null;
	}

	return (
		<Button
			ref={buttonRef}
			isIconOnly
			variant="ghost"
			aria-label={
				isDarkMode ? "Switch to light mode" : "Switch to dark mode"
			}
			{...props}
			onPress={toggleSwitchTheme}
		>
			{isDarkMode ? <Moon aria-hidden /> : <Sun aria-hidden />}
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
});

ThemeSwitch.displayName = "ThemeSwitch";
