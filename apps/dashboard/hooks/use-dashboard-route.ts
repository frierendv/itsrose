"use client";

import { authClient } from "@/shared/client";
import {
	ADMIN_SIDEBAR_ITEMS,
	DEFAULT_SIDEBAR_ITEMS,
	EXTERNAL_RESOURCE,
	USER_SETTINGS_SIDEBAR_ITEMS,
	type SidebarItem,
} from "@/shared/dashboard";
import { useSession } from "@better-auth-ui/react";

export function useDashboardRoute() {
	const { isPending, data: session } = useSession(authClient);

	if (isPending || !session) {
		return { isPending, data: null };
	}
	const { user } = session;

	const sidebarMainItems: SidebarItem[] = [
		DEFAULT_SIDEBAR_ITEMS,
		USER_SETTINGS_SIDEBAR_ITEMS,
	];
	const sidebarSecondaryItems: SidebarItem[] = [EXTERNAL_RESOURCE];
	if (user.role === "admin") {
		sidebarMainItems.push(ADMIN_SIDEBAR_ITEMS);
	}
	const data = {
		sidebarMainItems,
		sidebarSecondaryItems,
	};
	return { isPending, data };
}
