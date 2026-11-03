"use client";

import { ArrowRight, FileDollar } from "@gravity-ui/icons";
import { buttonVariants, Typography } from "@heroui/react";
import NextLink from "next/link";
import {
	ActiveSubscriptionCard,
	BillingFaq,
	InvoiceTable,
	LifecycleBanners,
	PlanGrid,
} from "../components";
import { BILLING_KEY_POINTS, FAQ_ITEMS } from "../constants";
import { useInvoices, usePlans, useSubscription } from "../hooks";

export const BillingPage: React.FC = () => {
	const { subscription, isPending: isSubPending } = useSubscription();
	const { plans, isPending: isPlansPending } = usePlans();
	const { invoices, isPending: isInvoicesPending } = useInvoices();

	const pendingInvoice =
		invoices.find(
			(inv) =>
				(inv.status || "").toLowerCase() === "pending" ||
				(inv.status || "").toLowerCase() === "unpaid"
		) ?? null;

	return (
		<div className="flex flex-col gap-8">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div className="flex flex-col gap-1">
					<Typography type="h2">Billing & Subscriptions</Typography>
					<Typography type="body-sm" color="muted">
						Manage your subscription plan, monitor usage rate
						limits, and view past payment invoices.
					</Typography>
				</div>
				<NextLink
					className={buttonVariants({
						variant: "outline",
						size: "sm",
					})}
					href="/account/billing/invoices"
				>
					<FileDollar aria-hidden className="size-4" />
					<span>View All Invoices</span>
				</NextLink>
			</div>

			{/* Lifecycle Status Banners (Past Due / Downgrade Scheduled) */}
			<LifecycleBanners
				subscription={subscription}
				pendingInvoice={pendingInvoice}
			/>

			{/* Current Subscription Section */}
			<section className="flex flex-col gap-3" id="current-subscription">
				<Typography type="h3">Current Plan</Typography>
				<ActiveSubscriptionCard
					subscription={subscription}
					plans={plans}
					isPending={isSubPending}
				/>
			</section>

			{/* Available Plans & Upgrades Section */}
			<section className="flex flex-col gap-3" id="available-plans">
				<div className="flex flex-col gap-1">
					<Typography type="h3">Available Plans</Typography>
					<Typography type="body-sm" color="muted">
						Scale seamlessly as your API workload expands. Mid-cycle
						upgrades calculate net prorated credit immediately.
					</Typography>
				</div>
				<PlanGrid
					plans={plans}
					subscription={subscription}
					isPending={isPlansPending}
				/>
			</section>

			{/* Recent Invoices Preview Section */}
			<section className="flex flex-col gap-3" id="recent-invoices">
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-1">
						<Typography type="h3">Recent Invoices</Typography>
						<Typography type="body-sm" color="muted">
							Recent receipts and pending transaction orders.
						</Typography>
					</div>
					{invoices.length > 5 && (
						<NextLink
							href="/account/billing/invoices"
							className={buttonVariants({
								variant: "ghost",
								size: "sm",
							})}
						>
							<span>All Invoices</span>
							<ArrowRight className="size-3.5" />
						</NextLink>
					)}
				</div>
				<InvoiceTable
					invoices={invoices.slice(0, 5)}
					showFilters={false}
					showPagination={false}
					isPending={isInvoicesPending}
					emptyMessage="No billing transactions recorded yet."
				/>
			</section>

			{/* Billing FAQ & Compliance Section */}
			<section className="flex flex-col gap-4" id="billing-faq">
				<div className="flex flex-col gap-1">
					<Typography type="h3">Security & Billing FAQ</Typography>
					<Typography type="body-sm" color="muted">
						Common questions regarding payment processing, mid-cycle
						prorations, and tax receipts.
					</Typography>
				</div>
				<BillingFaq
					fagItems={FAQ_ITEMS}
					KeyPoints={BILLING_KEY_POINTS}
				/>
			</section>
		</div>
	);
};

BillingPage.displayName = "BillingPage";
