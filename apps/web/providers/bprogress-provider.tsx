"use client";

import { ProgressProvider as BProgressProvider } from "@bprogress/next/app";
import type { PropsWithChildren } from "react";

/**
 * First order
 */
export const ProgressProvider = ({ children }: PropsWithChildren) => (
	<BProgressProvider
		color="#FF66CC"
		spinnerPosition="top-right"
		options={{
			positionUsing: "translate3d",
			direction: "ltr",
			showSpinner: false,
		}}
		shallowRouting
		memo
		disableSameURL
	>
		{children}
	</BProgressProvider>
);
