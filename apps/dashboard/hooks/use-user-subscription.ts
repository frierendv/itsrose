"use client";

import { useSubscription } from "@/client/billing/hooks";

export function useUserSubscription() {
	return useSubscription();
}
