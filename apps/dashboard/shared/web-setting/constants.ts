import type { DeepRequired } from "@/types";
import { ThemeAnimationType } from "react-theme-switch-animation";
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
	themeSwitch: {
		animationType: ThemeAnimationType.CIRCLE,
		duration: 750,
		blurAmount: 2,
		direction: "ltr",
		gifUrl: "/assets/itsrose-text.gif",
	},
};
