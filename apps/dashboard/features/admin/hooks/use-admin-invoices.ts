"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "@heroui/react";
import type { Invoice } from "@itsrose/auth-billing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingQueryKeys } from "../../billing/query-keys";
import { adminQueryKeys } from "../query-keys";
import type { InvoiceFilters, VoidInvoiceInput } from "../types";

/**
 * Hook to retrieve all system invoices with admin filters.
 */
export function useAdminInvoices(filters?: InvoiceFilters) {
	const query = useQuery({
		queryKey: adminQueryKeys.invoices.list(
			filters as Record<string, unknown>
		),
		queryFn: async (): Promise<Invoice[]> => {
			const res = await withAuthQuery(
				authClient.itsrose.payment.listInvoice({
					query: {
						status:
							filters?.status && filters.status !== "all"
								? filters.status
								: undefined,
						user_id: filters?.userId,
						invoice_type:
							filters?.invoice_type &&
							filters.invoice_type !== "ALL"
								? filters.invoice_type
								: undefined,
						limit: filters?.limit,
						offset: filters?.offset,
					},
				})
			);

			return res ?? [];
		},
	});

	return {
		...query,
		invoices: query.data ?? [],
	};
}

/**
 * Hook to retrieve a single invoice by its ID.
 */
export function useAdminInvoice(invoiceId: string) {
	return useQuery({
		queryKey: adminQueryKeys.invoices.detail(invoiceId),
		queryFn: async (): Promise<Invoice | null> => {
			if (!invoiceId) {
				return null;
			}
			const res = await withAuthQuery(
				authClient.itsrose.payment.getInvoice({
					query: { invoice_id: invoiceId },
				})
			);
			return res ?? null;
		},
		enabled: Boolean(invoiceId),
	});
}

/**
 * Mutation to void an unpaid pending invoice.
 */
export function useVoidInvoiceMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ invoice_id, reason }: VoidInvoiceInput) => {
			return withAuthQuery(
				authClient.itsrose.payment.voidInvoice({
					invoice_id,
					reason,
				})
			);
		},
		onSuccess: (_, variables) => {
			toast.success(
				`Invoice ${variables.invoice_id} voided successfully.`
			);
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.invoices.all,
			});
			queryClient.invalidateQueries({
				queryKey: billingQueryKeys.all,
			});
		},
		onError: (err) => {
			toast.danger(getErrorMessage(err, "Failed to void invoice."));
		},
	});
}
