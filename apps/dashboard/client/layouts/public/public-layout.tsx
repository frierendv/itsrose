"use client";

import { BaseLayout, MainLayout } from "@/components/layout";
import { memo, type PropsWithChildren } from "react";
import { PublicFooter } from "./footer";
import { PublicNavbar } from "./navbar";

export const PublicLayout = memo<PropsWithChildren>(({ children }) => (
	<BaseLayout>
		<PublicNavbar />

		<MainLayout className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			{children}
		</MainLayout>

		<PublicFooter />
	</BaseLayout>
));

PublicLayout.displayName = "PublicLayout";
