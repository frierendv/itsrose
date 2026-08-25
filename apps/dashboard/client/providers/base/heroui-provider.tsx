"use client";

import { ToastProvider, type ToastProviderProps } from "@heroui/react/toast";

export type HeroUIProviderProps = {
	/** Toast options */
	toast?: ToastProviderProps;
};
/**
 * MUST be used in `base-provider`
 */
export const HeroUIProvider = ({ toast }: HeroUIProviderProps) => (
	<ToastProvider {...toast} />
);
