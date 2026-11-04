import type { DeepPartial } from "@/types";
import type {
	AppProgressProviderProps,
	BProgressOptions,
} from "@bprogress/next";
import type { ToastVariants } from "@heroui/react";
import type { ThemeProviderProps } from "next-themes";

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
	"enableColorScheme" | "defaultTheme" | "enableSystem"
>;

/**
 * Default web settings
 */
export type WebSettingStore = {
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
};
export type WebSettingActions = {
	/**
	 * Change option for {@linkcode ProgressOptions}
	 */
	setProgress: SettingSetter<DeepPartial<ProgressOptions>>;
	/**
	 * Change option for {@linkcode ToastOptions}
	 */
	setToast: SettingSetter<DeepPartial<ToastOptions>>;
	/**
	 * Change option for {@linkcode ThemeOptions}
	 */
	setTheme: SettingSetter<DeepPartial<ThemeOptions>>;
	/** Reset to {@linkcode DefaultWebSetting | default} values  */
	resetDefault: () => void;
};

export type WebSetting = WebSettingStore & WebSettingActions;
