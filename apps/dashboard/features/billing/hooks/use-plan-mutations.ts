"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import type { Invoice, ProrationDetails } from "@itsrose/auth-billing";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { billingQueryKeys } from "../query-keys";

export interface UpgradeMutationVariables {
	targetTier: string;
	notes?: string;
}

export interface UpgradeMutationResult {
	invoice: Invoice;
	proration?: ProrationDetails | null;
}

/**
 * Mutation hook to initiate a mid-cycle prorated upgrade.
 * Calls `authClient.itsrose.subscription.upgrade({ target_tier })`.
 * Automatically invalidates subscription and invoices queries.
 */
export function useUpgradeMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			targetTier,
			notes,
		}: UpgradeMutationVariables): Promise<UpgradeMutationResult> => {
			const res = await withAuthQuery(
				authClient.itsrose.subscription.upgrade({
					target_tier: targetTier,
					notes,
				})
			);
			if (!res) {
				throw new Error("Upgrade failed: empty response.");
			}
			return res;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: billingQueryKeys.subscription(),
			});
			queryClient.invalidateQueries({
				queryKey: billingQueryKeys.all,
			});
		},
	});
}

export interface DowngradeMutationVariables {
	targetTier: string;
}

export interface DowngradeMutationResult {
	success: boolean;
	message: string;
	current_tier?: string;
	scheduled_tier: string;
	effective_date?: string | Date;
	retains_access_until?: string | Date;
}

/**
 * Mutation hook to schedule an end-of-cycle downgrade.
 * Calls `authClient.itsrose.subscription.downgrade({ target_tier })`.
 * Automatically invalidates subscription and invoices queries.
 */
export function useDowngradeMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			targetTier,
		}: DowngradeMutationVariables): Promise<DowngradeMutationResult> => {
			const res = await withAuthQuery(
				authClient.itsrose.subscription.downgrade({
					target_tier: targetTier,
				})
			);
			if (!res) {
				throw new Error("Downgrade failed: empty response.");
			}
			return res;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: billingQueryKeys.subscription(),
			});
			queryClient.invalidateQueries({
				queryKey: billingQueryKeys.all,
			});
		},
	});
}

export interface CancelDowngradeResult {
	success: boolean;
	message: string;
	current_tier?: string;
	scheduled_tier: null;
}

/**
 * Mutation hook to cancel a scheduled downgrade mid-cycle.
 * Calls `authClient.itsrose.subscription.cancelDowngrade()`.
 * Automatically invalidates subscription and invoices queries.
 */
export function useCancelDowngradeMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (): Promise<CancelDowngradeResult> => {
			const res = await withAuthQuery(
				authClient.itsrose.subscription.cancelDowngrade()
			);
			if (!res) {
				throw new Error("Cancel downgrade failed: empty response.");
			}
			return res;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: billingQueryKeys.subscription(),
			});
			queryClient.invalidateQueries({
				queryKey: billingQueryKeys.all,
			});
		},
	});
}
