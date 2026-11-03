"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { toast } from "@heroui/react";
import type { ApiPlan } from "@itsrose/auth-billing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatePlanInput, UpdatePlanInput } from "../types";
import { adminQueryKeys } from "./query-keys";

/**
 * Fetch all available billing plans catalog.
 */
export function useAdminPlans() {
	const query = useQuery({
		queryKey: adminQueryKeys.plans.list(),
		queryFn: async (): Promise<ApiPlan[]> => {
			const res = await withAuthQuery(authClient.itsrose.plan.list());
			return (res as unknown as ApiPlan[]) || [];
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
			return (res as unknown as ApiPlan) ?? null;
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
		mutationFn: async (data: CreatePlanInput) => {
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
			return res as unknown as ApiPlan;
		},
		onSuccess: (created) => {
			toast.success(`Plan "${created.name}" created successfully.`);
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.plans.all,
			});
			queryClient.invalidateQueries({
				queryKey: ["billing", "plans"],
			});
		},
		onError: (err: any) => {
			toast.danger(err?.message || "Failed to create plan.");
		},
	});
}

/**
 * Mutation to update an existing billing plan.
 */
export function useUpdatePlanMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: UpdatePlanInput) => {
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
			return res as unknown as ApiPlan;
		},
		onSuccess: (updated) => {
			toast.success(`Plan "${updated.name}" updated successfully.`);
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.plans.all,
			});
			queryClient.invalidateQueries({
				queryKey: ["billing", "plans"],
			});
		},
		onError: (err: any) => {
			toast.danger(err?.message || "Failed to update plan.");
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
			const res = await withAuthQuery(
				authClient.itsrose.plan.delete({
					plan_id: planId,
				})
			);
			return res;
		},
		onSuccess: (_, planId) => {
			toast.success(`Plan "${planId}" deleted successfully.`);
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.plans.all,
			});
			queryClient.invalidateQueries({
				queryKey: ["billing", "plans"],
			});
		},
		onError: (err: any) => {
			toast.danger(err?.message || "Failed to delete plan.");
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
			const seedFn =
				authClient.itsrose.plan.seed ||
				(authClient.itsrose as any).seedPlans;
			const res = await withAuthQuery(
				(seedFn as any)({ force: force ?? true })
			);
			return res as unknown as { count: number; plans: ApiPlan[] };
		},
		onSuccess: (data) => {
			toast.success(
				`Catalog seeded with ${data.count ?? 3} default plans.`
			);
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.plans.all,
			});
			queryClient.invalidateQueries({
				queryKey: ["billing", "plans"],
			});
		},
		onError: (err: any) => {
			toast.danger(err?.message || "Failed to seed default plans.");
		},
	});
}
