"use client";

import { useStoreWebSetting } from "@/shared/web-setting";
import Moon from "@gravity-ui/icons/Moon";
import Sun from "@gravity-ui/icons/Sun";
import { Button, type ButtonRootProps } from "@heroui/react/button";
import { useTheme } from "next-themes";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
	ThemeAnimationType,
	useModeAnimation,
} from "react-theme-switch-animation";

export const ThemeSwitchBase = memo<ButtonRootProps>((props) => {
	const [mounted, setMounted] = useState<boolean>(false);
	const [isDisable, setDisable] = useState<boolean>(false);
	const { themeSwitch } = useStoreWebSetting();
	const { resolvedTheme, setTheme } = useTheme();

	useEffect(() => setMounted(true), []);

	const isDarkMode = useMemo(() => resolvedTheme === "dark", [resolvedTheme]);
	const onDarkModeChange = useCallback(
		(isDark: boolean) => {
			setTheme(isDark ? "dark" : "light");
		},
		[setTheme]
	);
	const animationSetting = useMemo(() => {
		return themeSwitch;
	}, [themeSwitch]);
	const { ref: buttonRef, toggleSwitchTheme } = useModeAnimation({
		animationType: animationSetting.animationType,
		direction: animationSetting.direction,
		gifUrl:
			animationSetting.animationType === ThemeAnimationType.GIF
				? animationSetting.gifUrl
					? animationSetting.gifUrl
					: "/assets/itsrose-text.gif"
				: undefined,
		duration: animationSetting.duration,
		blurAmount: animationSetting.blurAmount,
		styleId: "theme-animation-sw",
		isDarkMode,
		onDarkModeChange,
	});

	const handleToggleSwitchTheme = useCallback(() => {
		if (themeSwitch.duration) {
			setDisable(true);
			setTimeout(() => setDisable(false), themeSwitch.duration);
		}
		toggleSwitchTheme();
	}, [themeSwitch.duration, toggleSwitchTheme]);

	const icon = useMemo(() => (isDarkMode ? <Moon /> : <Sun />), [isDarkMode]);

	if (!mounted) {
		return null;
	}

	return (
		<Button
			ref={buttonRef}
			isIconOnly
			variant="outline"
			isPending={isDisable}
			{...props}
			aria-label={
				isDarkMode ? "Switch to light mode" : "Switch to dark mode"
			}
			onPress={handleToggleSwitchTheme}
		>
			{icon}
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
});

ThemeSwitchBase.displayName = "ThemeSwitchBase";
