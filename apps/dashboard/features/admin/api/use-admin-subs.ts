"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { toast } from "@heroui/react";
import type { CronExecutionResult, Subscription } from "@itsrose/auth/itsrose";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	BillingCronInput,
	SubscriptionFilters,
	UpdateSubscriptionInput,
} from "../types";
import { adminQueryKeys } from "./query-keys";

/**
 * Hook to retrieve all subscriptions with admin filters.
 */
export function useAdminSubscriptions(filters?: SubscriptionFilters) {
	const query = useQuery({
		queryKey: adminQueryKeys.subscriptions.list(
			filters as Record<string, unknown>
		),
		queryFn: async (): Promise<Subscription[]> => {
			const res = await withAuthQuery(
				authClient.itsrose.subscription.list({
					query: {
						userId: filters?.userId,
						status:
							filters?.status && filters.status !== "all"
								? filters.status
								: undefined,
						limit: filters?.limit,
						offset: filters?.offset,
					},
				})
			);
			return (res as unknown as Subscription[]) || [];
		},
	});

	return {
		...query,
		subscriptions: query.data ?? [],
	};
}

/**
 * Hook to retrieve a single subscription by ID.
 */
export function useAdminSubscription(subscriptionId: string) {
	return useQuery({
		queryKey: adminQueryKeys.subscriptions.detail(subscriptionId),
		queryFn: async (): Promise<Subscription | null> => {
			if (!subscriptionId) {
				return null;
			}
			const res = await withAuthQuery(
				authClient.itsrose.subscription.get({
					query: { subscription_id: subscriptionId },
				})
			);
			return (res as unknown as Subscription) ?? null;
		},
		enabled: Boolean(subscriptionId),
	});
}

/**
 * Mutation to manually assign or update a subscription override.
 */
export function useUpdateSubscriptionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: UpdateSubscriptionInput) => {
			const res = await withAuthQuery(
				authClient.itsrose.subscription.update(input)
			);
			return res as unknown as Subscription;
		},
		onSuccess: (sub) => {
			toast.success(
				`Subscription updated for plan "${String(sub.plan_id).toUpperCase()}".`
			);
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.subscriptions.all,
			});
			queryClient.invalidateQueries({
				queryKey: ["billing"],
			});
		},
		onError: (err: any) => {
			toast.danger(
				err?.message || "Failed to update subscription override."
			);
		},
	});
}

/**
 * Mutation to cancel a subscription immediately or at period end.
 */
export function useCancelSubscriptionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (variables: {
			subscriptionId: string;
			cancelAtPeriodEnd?: boolean;
		}) => {
			const res = await withAuthQuery(
				authClient.itsrose.subscription.cancel({
					subscription_id: variables.subscriptionId,
					cancel_at_period_end: variables.cancelAtPeriodEnd ?? true,
				})
			);
			return res as unknown as Subscription;
		},
		onSuccess: (_, variables) => {
			const msg = variables.cancelAtPeriodEnd
				? "Subscription set to cancel at period end."
				: "Subscription canceled immediately.";
			toast.success(msg);
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.subscriptions.all,
			});
			queryClient.invalidateQueries({
				queryKey: ["billing"],
			});
		},
		onError: (err: any) => {
			toast.danger(err?.message || "Failed to cancel subscription.");
		},
	});
}

/**
 * Mutation to restore a scheduled canceled subscription.
 */
export function useRestoreSubscriptionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (variables: { subscriptionId: string }) => {
			const res = await withAuthQuery(
				authClient.itsrose.subscription.restore({
					subscription_id: variables.subscriptionId,
				})
			);
			return res;
		},
		onSuccess: () => {
			toast.success("Subscription restored successfully.");
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.subscriptions.all,
			});
			queryClient.invalidateQueries({
				queryKey: ["billing"],
			});
		},
		onError: (err: any) => {
			toast.danger(err?.message || "Failed to restore subscription.");
		},
	});
}

/**
 * Mutation to trigger the recurring billing cron job manually.
 */
export function useTriggerCronMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input?: BillingCronInput) => {
			const res = await withAuthQuery(
				authClient.itsrose.subscription.cron({
					lead_days: input?.lead_days,
					grace_days: input?.grace_days,
					secret: input?.secret,
				})
			);
			return res as unknown as {
				success: boolean;
			} & CronExecutionResult;
		},
		onSuccess: (result) => {
			toast.success(
				`Cron completed: ${result.dispatched_renewals ?? 0} renewals dispatched, ${result.swept_expired ?? 0} expired swept.`
			);
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.subscriptions.all,
			});
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.invoices.all,
			});
			queryClient.invalidateQueries({
				queryKey: ["billing"],
			});
		},
		onError: (err: any) => {
			toast.danger(err?.message || "Billing cron execution failed.");
		},
	});
}
