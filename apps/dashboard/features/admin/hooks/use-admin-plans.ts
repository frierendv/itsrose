"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "@heroui/react";
import type { ApiPlan } from "@itsrose/auth-billing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingQueryKeys } from "../../billing/query-keys";
import { adminQueryKeys } from "../query-keys";
import type { CreatePlanInput, UpdatePlanInput } from "../types";

/**
 * Fetch all available billing plans catalog.
 */
export function useAdminPlans() {
	const query = useQuery({
		queryKey: adminQueryKeys.plans.list(),
		queryFn: async (): Promise<ApiPlan[]> => {
			const res = await withAuthQuery(authClient.itsrose.plan.list());
			return res ?? [];
		},
	});

	return {
		...query,
		plans: query.data ?? [],
	};
}

/**
 * Fetch a single plan by plan_id.
 */
export function useAdminPlan(planId: string) {
	return useQuery({
		queryKey: adminQueryKeys.plans.detail(planId),
		queryFn: async (): Promise<ApiPlan | null> => {
			if (!planId) {
				return null;
			}
			const res = await withAuthQuery(
				authClient.itsrose.plan.get({
					query: { plan_id: planId },
				})
			);
			return res ?? null;
		},
		enabled: Boolean(planId),
	});
}

/**
 * Mutation to create a new billing plan.
 */
export function useCreatePlanMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreatePlanInput): Promise<ApiPlan> => {
			const res = await withAuthQuery(
				authClient.itsrose.plan.create({
					plan_id: data.plan_id.toLowerCase().trim(),
					name: data.name.trim(),
					description: data.description?.trim() ?? "",
					prices: [
						{
							id: `${data.plan_id.toLowerCase().trim()}-idr-${data.interval || "month"}`,
							amount: Math.round(Number(data.price_amount)),
							currency: "IDR",
							interval: data.interval || "month",
						},
					],
					features: data.features ?? [],
					highlighted: Boolean(data.highlighted),
				})
			);
			if (!res) {
				throw new Error("Plan create returned no data.");
			}
			return res;
		},
		onSuccess: (created) => {
			toast.success(`Plan "${created.name}" created successfully.`);
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.plans.all,
			});
			queryClient.invalidateQueries({
				queryKey: billingQueryKeys.plans(),
			});
		},
		onError: (err) => {
			toast.danger(getErrorMessage(err, "Failed to create plan."));
		},
	});
}

/**
 * Mutation to update an existing billing plan.
 */
export function useUpdatePlanMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: UpdatePlanInput): Promise<ApiPlan> => {
			const payload: Parameters<
				typeof authClient.itsrose.plan.update
			>[0] = {
				plan_id: data.plan_id,
			};

			if (data.name !== undefined) {
				payload.name = data.name.trim();
			}
			if (data.description !== undefined) {
				payload.description = data.description.trim();
			}
			if (data.price_amount !== undefined) {
				payload.prices = [
					{
						id: `${data.plan_id}-idr-${data.interval || "month"}`,
						amount: Math.round(Number(data.price_amount)),
						currency: "IDR",
						interval: data.interval || "month",
					},
				];
			}
			if (data.features !== undefined) {
				payload.features = data.features;
			}
			if (data.highlighted !== undefined) {
				payload.highlighted = data.highlighted;
			}
			if (data.seatBased !== undefined) {
				payload.seatBased = data.seatBased;
			}

			const res = await withAuthQuery(
				authClient.itsrose.plan.update(payload)
			);
			if (!res) {
				throw new Error("Plan update returned no data.");
			}
			return res;
		},
		onSuccess: (updated) => {
			toast.success(`Plan "${updated.name}" updated successfully.`);
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.plans.all,
			});
			queryClient.invalidateQueries({
				queryKey: billingQueryKeys.plans(),
			});
		},
		onError: (err) => {
			toast.danger(getErrorMessage(err, "Failed to update plan."));
		},
	});
}

/**
 * Mutation to delete a billing plan.
 */
export function useDeletePlanMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (planId: string) => {
			return withAuthQuery(
				authClient.itsrose.plan.delete({
					plan_id: planId,
				})
			);
		},
		onSuccess: (_, planId) => {
			toast.success(`Plan "${planId}" deleted successfully.`);
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.plans.all,
			});
			queryClient.invalidateQueries({
				queryKey: billingQueryKeys.plans(),
			});
		},
		onError: (err) => {
			toast.danger(getErrorMessage(err, "Failed to delete plan."));
		},
	});
}

/**
 * Mutation to seed default system plans.
 */
export function useSeedPlansMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (force?: boolean) => {
			const res = await withAuthQuery(
				authClient.itsrose.plan.seed({ force: force ?? true })
			);
			if (!res) {
				throw new Error("Plan seed returned no data.");
			}
			return res;
		},
		onSuccess: (data) => {
			toast.success(
				`Catalog seeded with ${data.count ?? 3} default plans.`
			);
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.plans.all,
			});
			queryClient.invalidateQueries({
				queryKey: billingQueryKeys.plans(),
			});
		},
		onError: (err) => {
			toast.danger(getErrorMessage(err, "Failed to seed default plans."));
		},
	});
}
