"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "@heroui/react";
import type { UsageUnitRate } from "@itsrose/auth-usage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "../query-keys";

export const DEFAULT_USAGE_UNIT = "request";

export interface SetRateInput {
	plan_tier: string;
	/** Price in IDR per whole unit. */
	amount: number;
	unit?: string;
	note?: string;
}

/**
 * Current open unit rates per plan tier.
 */
export function useAdminRates() {
	const query = useQuery({
		queryKey: adminQueryKeys.usage.rates(),
		queryFn: async (): Promise<UsageUnitRate[]> => {
			const res = await withAuthQuery(authClient.usage.admin.rates());
			return res?.rates ?? [];
		},
	});

	return {
		...query,
		rates: query.data ?? [],
	};
}

/**
 * Publishes a new rate version; the API closes the previous open row and
 * writes an audit entry in the same statement.
 */
export function useSetRateMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: SetRateInput): Promise<UsageUnitRate> => {
			const res = await withAuthQuery(
				authClient.usage.admin.rates.set({
					plan_tier: input.plan_tier,
					amount: input.amount,
					unit: input.unit ?? DEFAULT_USAGE_UNIT,
					note: input.note,
				})
			);
			if (!res?.rate) {
				throw new Error("Rate update returned no data.");
			}
			return res.rate;
		},
		onSuccess: (rate) => {
			toast.success(
				`Rate version ${rate.rates_version} published for ${rate.plan_tier}.`
			);
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.usage.all,
			});
		},
		onError: (err) => {
			toast.danger(getErrorMessage(err, "Failed to update the rate."));
		},
	});
}
