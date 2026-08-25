import { ThemeAnimationType } from "react-theme-switch-animation";
import type { DefaultWebSetting } from "./types";

export const DEFAULT_WEB_SETTING: DefaultWebSetting = {
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
		attribute: "class",
		enableColorScheme: true,
		defaultTheme: "system",
		enableSystem: true,
	},
	themeSwitch: {
		animationType: ThemeAnimationType.CIRCLE,
		duration: 750,
		blurAmount: 2,
		direction: "ltr",
		gifUrl: "",
	},
};
