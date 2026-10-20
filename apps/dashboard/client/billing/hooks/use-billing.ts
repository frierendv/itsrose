"use client";

import { authClient } from "@/client/auth";
import { withAuthQuery } from "@/shared/utils";
import {
	BILLING_PLANS,
	type ApiPlan,
	type Invoice,
	type ProrationDetails,
	type Subscription,
} from "@itsrose/auth/itsrose";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const BILLING_QUERY_KEYS = {
	subscription: ["subscription"] as const,
	invoices: ["invoices"] as const,
	plans: ["plans"] as const,
};

/**
 * Hook to retrieve the current authenticated user's subscription.
 * Cached under `['subscription']`.
 */
export function useSubscription() {
	const query = useQuery({
		queryKey: BILLING_QUERY_KEYS.subscription,
		queryFn: async (): Promise<Subscription | null> => {
			const res = await withAuthQuery(
				authClient.itsrose.subscription.get()
			);
			return (res as unknown as Subscription) ?? null;
		},
	});

	return {
		...query,
		subscription: query.data ?? null,
	};
}

/**
 * Hook to retrieve invoices for the authenticated user.
 * Cached under `['invoices']`.
 */
export function useInvoices(options?: { status?: string }) {
	const query = useQuery({
		queryKey: [...BILLING_QUERY_KEYS.invoices, options?.status],
		queryFn: async (): Promise<Invoice[]> => {
			const res = await withAuthQuery(
				authClient.itsrose.payment.listInvoice({
					query: options?.status
						? { status: options.status }
						: undefined,
				})
			);
			return ((res as unknown as Invoice[]) || []).map((inv) => ({
				...inv,
				amount_idr: inv.gross_amount ?? inv.amount_idr ?? 0,
				payment_url: inv.payment_link_url ?? inv.payment_url ?? null,
			}));
		},
	});

	return {
		...query,
		invoices: query.data ?? [],
	};
}

/**
 * Hook to fetch available billing plans.
 * Cached under `['plans']`.
 */
export function usePlans() {
	const query = useQuery({
		queryKey: BILLING_QUERY_KEYS.plans,
		queryFn: async (): Promise<ApiPlan[]> => {
			try {
				const res = await withAuthQuery(authClient.itsrose.plan.list());
				if (Array.isArray(res) && res.length > 0) {
					return res as unknown as ApiPlan[];
				}
			} catch {
				// Fall back to built-in default plans if network fails
			}
			return BILLING_PLANS;
		},
		initialData: BILLING_PLANS,
	});

	return {
		...query,
		plans: query.data ?? BILLING_PLANS,
	};
}

export interface UpgradeMutationVariables {
	targetTier: string;
	notes?: string;
}

export interface UpgradeMutationResult {
	invoice: Invoice;
	proration: ProrationDetails;
}

/**
 * Mutation hook to initiate a mid-cycle prorated upgrade.
 * Calls `authClient.itsrose.subscription.upgrade({ target_tier })`.
 * Automatically invalidates `['subscription']` and `['invoices']`.
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
			return res as unknown as UpgradeMutationResult;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: BILLING_QUERY_KEYS.subscription,
			});
			queryClient.invalidateQueries({
				queryKey: BILLING_QUERY_KEYS.invoices,
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
	current_tier: string;
	scheduled_tier: string;
	effective_date: string | Date;
	retains_access_until: string | Date;
}

/**
 * Mutation hook to schedule an end-of-cycle downgrade.
 * Calls `authClient.itsrose.subscription.downgrade({ target_tier })`.
 * Automatically invalidates `['subscription']` and `['invoices']`.
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
			return res as unknown as DowngradeMutationResult;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: BILLING_QUERY_KEYS.subscription,
			});
			queryClient.invalidateQueries({
				queryKey: BILLING_QUERY_KEYS.invoices,
			});
		},
	});
}

export interface CancelDowngradeResult {
	success: boolean;
	message: string;
	current_tier: string;
	scheduled_tier: null;
}

/**
 * Mutation hook to cancel a scheduled downgrade mid-cycle.
 * Calls `authClient.itsrose.subscription.cancelDowngrade()`.
 * Automatically invalidates `['subscription']` and `['invoices']`.
 */
export function useCancelDowngradeMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (): Promise<CancelDowngradeResult> => {
			const res = await withAuthQuery(
				authClient.itsrose.subscription.cancelDowngrade()
			);
			return res as unknown as CancelDowngradeResult;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: BILLING_QUERY_KEYS.subscription,
			});
			queryClient.invalidateQueries({
				queryKey: BILLING_QUERY_KEYS.invoices,
			});
		},
	});
}
