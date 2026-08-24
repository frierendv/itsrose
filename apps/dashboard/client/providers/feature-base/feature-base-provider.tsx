"use client";

import { config } from "@/shared/config";
import { FeaturebaseProvider as BaseFeaturebaseProvider } from "featurebase-js/react";
import type { PropsWithChildren } from "react";

export const FeaturebaseProvider = ({ children }: PropsWithChildren) => {
	return (
		<BaseFeaturebaseProvider
			appId={config.FEATUREBASE_APP_ID}
			// featurebaseJwt={user.featurebaseJwt}   // see "Sync user information" below to attach identity & custom fields
		>
			{children}
		</BaseFeaturebaseProvider>
	);
};
