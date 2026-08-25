import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_WEB_SETTING } from "./constants";
import type { WebSetting } from "./types";

export const useStoreWebSetting = create<WebSetting>()(
	persist(
		(set) => ({
			/** value */
			...DEFAULT_WEB_SETTING,

			/** setter */
			setToast: (v) =>
				set((state) => ({ toast: { ...state.toast, ...v } })),
			setProgress: (v) =>
				set((state) => ({
					progress: {
						...state.progress,
						...v,
						options: { ...state.progress.options, ...v.options },
					},
				})),

			setTheme: (v) =>
				set((state) => ({ theme: { ...state.theme, ...v } })),

			setThemeSwitch: (v) =>
				set((state) => ({
					themeSwitch: { ...state.themeSwitch, ...v },
				})),

			resetDefault: () => set(DEFAULT_WEB_SETTING),
		}),
		{
			name: "device-web-settings",
			partialize: (state) => ({
				progress: state.progress,
				toast: state.toast,
				theme: state.theme,
				themeSwitch: state.themeSwitch,
			}),
			storage: createJSONStorage(() => localStorage),
			version: 1,
		}
	)
);
