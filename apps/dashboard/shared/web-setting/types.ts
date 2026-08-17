import type { DeepPartial, DeepRequired } from "@/types";
import type {
	AppProgressProviderProps,
	BProgressOptions,
} from "@bprogress/next";
import type { ToastVariants } from "@heroui/react";
import type { ThemeProviderProps } from "next-themes";
import type { ReactThemeSwitchAnimationProps } from "react-theme-switch-animation";

type SettingSetter<T> = (value: T) => void;

export type ProgressOptions = Pick<
	AppProgressProviderProps,
	"color" | "spinnerPosition"
> & {
	options?: Pick<BProgressOptions, "positionUsing" | "direction">;
};

export type ToastOptions = Pick<ToastVariants, "placement">;
export type ThemeOptions = Pick<
	ThemeProviderProps,
	"attribute" | "enableColorScheme" | "defaultTheme" | "enableSystem"
>;

export type ThemeSwitchOptions = Omit<
	ReactThemeSwitchAnimationProps,
	| "styleId"
	| "easing"
	| "isDarkMode"
	| "onDarkModeChange"
	| "pseudoElement"
	| "globalClassName"
>;

/**
 * Default web settings
 */
export type DefaultWebSetting = DeepRequired<
	Pick<WebSetting, "progress" | "toast" | "theme" | "themeSwitch">
>;
export type WebSetting = {
	/**
	 * Partial {@linkcode BProgressOptions | BProgress} options.
	 * See {@linkcode ProgressOptions}
	 */
	progress: ProgressOptions;
	/**
	 * Partial {@linkcode ToastVariants | Toast} options.
	 * See {@linkcode ToastOptions}
	 */
	toast: ToastOptions;
	/**
	 * Partial {@linkcode ThemeProviderProps | Next theme} options.
	 * See {@linkcode ThemeOptions}
	 */
	theme: ThemeOptions;
	/**
	 * Partial {@linkcode ReactThemeSwitchAnimationProps | Theme Switch} options.
	 * See {@linkcode ThemeSwitchOptions}
	 */
	themeSwitch: ThemeSwitchOptions;
	/**
	 * Change option for {@linkcode ProgressOptions}
	 */
	setProgress: SettingSetter<DeepPartial<ProgressOptions>>;
	/**
	 * Change option for {@linkcode ProgressOptions}
	 */
	setToast: SettingSetter<DeepPartial<ToastOptions>>;
	/**
	 * Change option for {@linkcode ProgressOptions}
	 */
	setTheme: SettingSetter<DeepPartial<ThemeOptions>>;
	/**
	 * Change option for {@linkcode ThemeSwitchOptions}
	 */
	setThemeSwitch: SettingSetter<DeepPartial<ThemeSwitchOptions>>;
	/** Reset to {@linkcode DefaultWebSetting | default} values  */
	resetDefault: () => void;
};
