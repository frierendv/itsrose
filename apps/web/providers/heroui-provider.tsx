"use client";

import { useRouter } from "@bprogress/next";
import { RouterProvider } from "@heroui/react";
import { ToastProvider } from "@heroui/react/toast";
import type { PropsWithChildren } from "react";

/**
 * Second order
 */
export const HeroUIProvider = ({ children }: PropsWithChildren) => {
	const router = useRouter();

	return (
		<RouterProvider navigate={router.push}>
			{children}
			<ToastProvider />
		</RouterProvider>
	);
};
