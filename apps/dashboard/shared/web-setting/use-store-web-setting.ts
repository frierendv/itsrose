import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_WEB_SETTING } from "./constants";
import type { WebSetting } from "./types";

export const useStoreWebSetting = create<WebSetting>()(
	persist(
		(set) => ({
			/** value */
			progress: DEFAULT_WEB_SETTING.progress,
			toast: DEFAULT_WEB_SETTING.toast,
			theme: DEFAULT_WEB_SETTING.theme,
			themeSwitch: DEFAULT_WEB_SETTING.themeSwitch,

			/** setter */
			setToast: (v) =>
				set(({ toast }) => ({ toast: { ...toast, ...v } })),
			setProgress: (v) =>
				set(({ progress }) => ({
					progress: {
						...progress,
						...v,
						...(v.options
							? { options: { ...progress.options, ...v.options } }
							: {}),
					},
				})),
			setTheme: (v) =>
				set(({ theme }) => ({ theme: { ...theme, ...v } })),
			setThemeSwitch: (v) =>
				set(({ themeSwitch }) => ({
					themeSwitch: { ...themeSwitch, ...v },
				})),

			resetDefault: () => set(DEFAULT_WEB_SETTING),
		}),
		{
			name: "device-web-settings",
			partialize: (s) => ({
				progress: s.progress,
				toast: s.toast,
				theme: s.theme,
				themeSwitch: s.themeSwitch,
			}),
			version: 1,
		}
	)
);
