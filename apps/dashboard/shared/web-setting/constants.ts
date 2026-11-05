import type { DeepRequired } from "@/types";
import type { WebSettingStore } from "./types";

export const DEFAULT_WEB_SETTING: DeepRequired<WebSettingStore> = {
	progress: {
		color: "#FF66CC",
		spinnerPosition: "top-right",
		options: {
			positionUsing: "translate3d",
			direction: "ltr",
		},
	},
	toast: { placement: "top end" },
	theme: {
		enableColorScheme: true,
		defaultTheme: "system",
		enableSystem: true,
	},
};
