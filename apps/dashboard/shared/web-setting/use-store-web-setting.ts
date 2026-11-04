import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_WEB_SETTING } from "./constants";
import type { WebSetting } from "./types";

type PersistedWebSetting = Pick<WebSetting, "progress" | "toast" | "theme">;

export const useStoreWebSetting = create<WebSetting>()(
	persist<WebSetting, [], [], PersistedWebSetting>(
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

			resetDefault: () => set(DEFAULT_WEB_SETTING),
		}),
		{
			name: "device-web-settings",
			partialize: (state) => ({
				progress: state.progress,
				toast: state.toast,
				theme: state.theme,
			}),
			storage: createJSONStorage(() => localStorage),
			version: 2,
			migrate: (persistedState, version) => {
				if (version < 2) {
					// The themeSwitch slice was removed in v2; strip it from
					// previously persisted state.
					const legacy = persistedState as PersistedWebSetting;
					return {
						progress: legacy.progress,
						toast: legacy.toast,
						theme: legacy.theme,
					};
				}
				return persistedState as PersistedWebSetting;
			},
		}
	)
);
