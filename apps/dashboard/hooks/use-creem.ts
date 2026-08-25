"use client";

import { authClient } from "@/shared/client";
import { withAuthQuery } from "@/shared/utils";
import type {
	CreateCheckoutInput,
	RetrieveSubscriptionInput,
	SearchTransactionsInput,
} from "@itsrose/auth/react";
import { useMutation, useQuery } from "@tanstack/react-query";

export function useHasAccessGranted() {
	return useQuery({
		queryKey: ["auth", "creem", "has-access-granted"],
		queryFn: () => withAuthQuery(authClient.creem.hasAccessGranted()),
	});
}

export function useCreateCheckout() {
	return useMutation({
		mutationKey: ["auth", "creem", "create-checkout"],
		mutationFn: async (input: CreateCheckoutInput) =>
			withAuthQuery(authClient.creem.createCheckout(input)),
	});
}

export function useCreatePortal() {
	return useMutation({
		mutationFn: async () => withAuthQuery(authClient.creem.createPortal()),
	});
}

export function useRetrieveSubscription() {
	return useQuery({
		queryKey: ["auth", "creem", "retrieve-subscription"],
		queryFn: () =>
			withAuthQuery(
				authClient.creem.retrieveSubscription(
					{} as RetrieveSubscriptionInput
				)
			),
	});
}

export function useSearchTransactions() {
	return useMutation({
		mutationFn: async (input?: SearchTransactionsInput) =>
			withAuthQuery(authClient.creem.searchTransactions(input)),
	});
}

export function useTransactionsQuery(input?: SearchTransactionsInput) {
	return useQuery({
		queryKey: ["auth", "creem", "transactions", input],
		queryFn: () =>
			withAuthQuery(authClient.creem.searchTransactions(input)),
	});
}
