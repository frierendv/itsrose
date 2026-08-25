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
	const { resolvedTheme: theme, setTheme } = useTheme();

	useEffect(() => setMounted(true), []);

	const isDarkMode = useMemo(() => theme === "dark", [theme]);
	const onDarkModeChange = () => {
		setTheme(theme === "light" ? "dark" : "light");
	};
	const animationSetting = useMemo(() => {
		return themeSwitch;
	}, [themeSwitch]);
	const { ref: buttonRef, toggleSwitchTheme } = useModeAnimation({
		animationType: animationSetting.animationType,
		gifUrl:
			animationSetting.animationType === ThemeAnimationType.GIF
				? animationSetting.gifUrl
					? animationSetting.gifUrl
					: "/assets/itsrose-text.gif"
				: undefined,
		duration: animationSetting.duration,
		blurAmount: animationSetting.blurAmount,
		styleId: "theme-animation-sw",
		onDarkModeChange,
	});

	const handleToggleSwitchTheme = useCallback(() => {
		let cb: () => void = () => void 0;
		if (themeSwitch.duration) {
			cb = () => {
				setDisable(true);
				setTimeout(() => setDisable(false), themeSwitch.duration);
			};
		}
		cb();
		toggleSwitchTheme();
	}, [themeSwitch.duration, toggleSwitchTheme]);

	const icon = useMemo(() => (isDarkMode ? <Moon /> : <Sun />), [isDarkMode]);

	if (!mounted) {
		return;
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
