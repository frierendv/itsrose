import { useEffect, useState } from "react";
import { DEFAULT_WEB_SETTING } from "./constants";
import type { WebSettingStore } from "./types";
import { useStoreWebSetting } from "./use-store-web-setting";

export function useHydratedWebSetting<T>(
	selector: (state: WebSettingStore) => T
) {
	const [hydrated, setHydrated] = useState(false);
	const store = useStoreWebSetting(selector);

	// eslint-disable-next-line react-hooks/set-state-in-effect
	useEffect(() => setHydrated(true), []);

	return hydrated ? store : selector(DEFAULT_WEB_SETTING);
}
