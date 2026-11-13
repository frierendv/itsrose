"use client";

import { withAuthQueryFn } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { adminQueryKeys } from "../query-keys";

/**
 * Retrieves a user's basic information for the admin popovers.
 *
 * The request is only issued when the query is enabled, so a closed popover
 * costs nothing — which matters, because this is rendered inside every row of
 * the admin invoice and subscription tables.
 */
export function useAdminUser(userId?: string, enabled = false) {
	return useQuery({
		queryKey: adminQueryKeys.users.detail(userId ?? ""),
		enabled: Boolean(userId) && enabled,
		queryFn: withAuthQueryFn(() =>
			authClient.admin.getUser({ query: { id: userId! } })
		),
	});
}

/**
 * Retrieves the current subscription of a user for the admin popover.
 */
export function useAdminUserSubscription(userId?: string, enabled = false) {
	return useQuery({
		queryKey: adminQueryKeys.users.subscription(userId ?? ""),
		enabled: Boolean(userId) && enabled,
		queryFn: withAuthQueryFn(() =>
			authClient.itsrose.subscription.get({ query: { user_id: userId! } })
		),
	});
}
