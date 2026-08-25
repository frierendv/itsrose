"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { create } from "zustand";

type ActivePathState = {
	pathname: string;
	setPathname: (pathname: string) => void;
};

export const useActivePathStore = create<ActivePathState>((set) => ({
	pathname: "",
	setPathname: (pathname) => set({ pathname }),
}));

const useSyncPathname = () => {
	const pathname = usePathname() ?? "";
	const setPathname = useActivePathStore((s) => s.setPathname);

	useEffect(() => {
		setPathname(pathname);
	}, [pathname, setPathname]);
};

export const useActivePath = () => {
	useSyncPathname();
	const pathname = useActivePathStore((s) => s.pathname);

	return { pathname };
};
