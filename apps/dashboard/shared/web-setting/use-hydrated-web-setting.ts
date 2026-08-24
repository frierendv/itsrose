import { useEffect, useState } from "react";
import type { WebSetting } from "./types";
import { useStoreWebSetting } from "./use-store-web-setting";

export function useHydratedWebSetting<T>(selector: (state: WebSetting) => T) {
	const [hydrated, setHydrated] = useState(false);
	const store = useStoreWebSetting(selector);

	// eslint-disable-next-line react-hooks/set-state-in-effect
	useEffect(() => setHydrated(true), []);

	return hydrated ? store : ({} as T);
}
