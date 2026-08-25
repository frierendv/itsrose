"use client";

import type { AppProgressProviderProps } from "@bprogress/next";
import { ProgressProvider as BProgressProvider } from "@bprogress/next/app";
import type { PropsWithChildren } from "react";

export type ProgressProviderProps = PropsWithChildren<AppProgressProviderProps>;
/**
 * Should be used in `base-provider`
 */
export const ProgressProvider = ({
	children,
	...props
}: ProgressProviderProps) => (
	<BProgressProvider
		color="#FF66CC"
		spinnerPosition="top-right"
		{...props}
		options={{
			positionUsing: "translate3d",
			direction: "ltr",
			...props?.options,
			indeterminate: true,
		}}
		shallowRouting
		memo
		disableAnchorClick
		disableSameURL
	>
		{children}
	</BProgressProvider>
);
