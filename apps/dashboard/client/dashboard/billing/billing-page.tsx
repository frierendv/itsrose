"use client";

import { UserBillingSettings } from "@better-auth-ui/heroui/plugins/billing";
// import { Content } from "@/components/common";
// import { Pricing } from "@/components/pricing";
// import { useRetrieveSubscription } from "@/hooks/use-creem";
import { Separator } from "@heroui/react/separator";
import {
	BillingFaq,
	// BillingHeader,
	// SubscriptionCard,
	// SubscriptionOverview,
} from "./components";

export const BillingPage: React.FC = () => {
	return (
		<>
			<UserBillingSettings />
			<Separator />
			<BillingFaq />
		</>
	);
	// const {
	// 	data: subscription,
	// 	isLoading,
	// 	isRefetching,
	// 	error,
	// 	refetch,
	// } = useRetrieveSubscription();
	// const isPending = isLoading || isRefetching;
	// return (
	// 	<Content className="space-y-6">
	// 		{/* Page Header with Refresh and Portal actions */}
	// 		<BillingHeader
	// 			isRefetching={isRefetching}
	// 			onRefresh={() => refetch()}
	// 		/>
	// 		{/* 4-Card Overview Metrics */}
	// 		<SubscriptionOverview
	// 			subscription={subscription}
	// 			isPending={isPending}
	// 		/>
	// 		{/* Active Subscription Management Card */}
	// 		<div className="flex flex-col gap-3">
	// 			<div>
	// 				<h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
	// 					Active Subscription
	// 				</h2>
	// 				<p className="text-xs text-muted mt-0.5">
	// 					Your current plan status, billing cycle, and portal
	// 					configuration.
	// 				</p>
	// 			</div>
	// 			<SubscriptionCard
	// 				subscription={subscription}
	// 				isPending={isPending}
	// 				error={error}
	// 				onRefetch={() => refetch()}
	// 			/>
	// 		</div>
	// 		{/* Available Pricing Plans */}
	// 		<div
	// 			id="pricing-section"
	// 			className="flex flex-col gap-3 scroll-mt-6"
	// 		>
	// 			<div>
	// 				<h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
	// 					Available Plans
	// 				</h2>
	// 				<p className="text-xs text-muted mt-0.5">
	// 					Choose the plan that fits your needs or upgrade to
	// 					unlock higher rate limits, dedicated models, and
	// 					priority support.
	// 				</p>
	// 			</div>
	// 			<Pricing />
	// 		</div>
	// 		<Separator />
	// 		{/* Frequently Asked Questions & Security */}
	// 		<BillingFaq />
	// 	</Content>
	// );
};

BillingPage.displayName = "BillingPage";
