"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { toast } from "@heroui/react";
import type { Invoice } from "@itsrose/auth/itsrose";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InvoiceFilters, VoidInvoiceInput } from "../types";
import { adminQueryKeys } from "./query-keys";

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
			return (res as unknown as Invoice) ?? null;
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
			const res = await withAuthQuery(
				authClient.itsrose.payment.voidInvoice({
					invoice_id,
					reason,
				})
			);
			return res;
		},
		onSuccess: (_, variables) => {
			toast.success(
				`Invoice ${variables.invoice_id} voided successfully.`
			);
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.invoices.all,
			});
			queryClient.invalidateQueries({
				queryKey: ["billing"],
			});
		},
		onError: (err: any) => {
			toast.danger(err?.message || "Failed to void invoice.");
		},
	});
}
