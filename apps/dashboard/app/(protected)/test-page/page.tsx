"use client";

import { authClient } from "@/client/auth";
import { Button } from "@heroui/react/button";
import { Skeleton } from "@heroui/react/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";

export default () => {
	const { mutate: seed, isPending } = useMutation({
		mutationKey: ["create-invoice"],
		mutationFn: async () => {
			await authClient.itsrose.plan.seed();
		},
	});

	const { data: invoices, isPending: invoicePending } = useQuery({
		queryKey: ["list-invoices"],
		queryFn: async () => {
			const response = await authClient.itsrose.payment.listInvoice();

			return response.data || [];
		},
	});

	return (
		<div className="flex flex-col gap-2">
			<Button isPending={isPending} onPress={() => seed()}>
				seed
			</Button>

			{invoicePending || !invoices ? (
				<Skeleton className="h-24 w-full" />
			) : (
				[...invoices].map((invoice) => (
					<div key={invoice.invoice_id}>{invoice.invoice_id}</div>
				))
			)}
		</div>
	);
};
