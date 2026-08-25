"use client";

import { usePathname } from "next/navigation";

export type ActivePath = {
	pathname: `/${string}` | "";
};
export const useActivePath = (): ActivePath => {
	const rawPathname = usePathname() ?? "";
	const pathname = rawPathname.split("?")[0]?.split("#")[0] || "";

	return { pathname } as ActivePath;
};
