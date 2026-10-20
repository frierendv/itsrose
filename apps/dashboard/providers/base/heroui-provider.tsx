"use client";

import { useRouter } from "@bprogress/next";
import { RouterProvider } from "@heroui/react";
import { ToastProvider, type ToastProviderProps } from "@heroui/react/toast";
import type { PropsWithChildren } from "react";

export type HeroUIProviderProps = PropsWithChildren<{
	/** Toast options */
	toast?: ToastProviderProps;
}>;
/**
 * MUST be used in `base-provider`
 */
export const HeroUIProvider = ({ children, toast }: HeroUIProviderProps) => {
	const router = useRouter();

	return (
		<RouterProvider navigate={router.push}>
			{children}
			<ToastProvider {...toast} />
		</RouterProvider>
	);
};
