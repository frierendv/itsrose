"use client";

import {
	ActiveSubscriptionCard,
	InvoiceTable,
	useInvoices,
	usePlans,
	useSubscription,
} from "@/features/billing";
import { UsageQuotaCard, UsageSummaryCards } from "@/features/usage";
import { authClient } from "@/lib/auth";
import { useSession } from "@better-auth-ui/react";
import {
	Archive,
	FileDollar,
	PersonGear,
	Shield,
	ShieldExclamation,
	Wallet,
} from "@gravity-ui/icons";
import { Card, Typography } from "@heroui/react";
import NextLink from "next/link";

const QUICK_LINKS = [
	{
		title: "Billing",
		description: "Plans, proration, and renewals",
		url: "/account/billing",
		icon: Wallet,
	},
	{
		title: "Invoices",
		description: "Receipts and payment history",
		url: "/account/billing/invoices",
		icon: FileDollar,
	},
	{
		title: "Account",
		description: "Profile and personal details",
		url: "/account",
		icon: PersonGear,
	},
	{
		title: "Security",
		description: "Sessions, keys, and 2FA",
		url: "/account/security",
		icon: ShieldExclamation,
	},
	{
		title: "Activity",
		description: "Recent authentication events",
		url: "/logs/activity",
		icon: Archive,
	},
] as const;

export const HomePage: React.FC = () => {
	const { subscription, isPending: isSubPending } = useSubscription();
	const { plans } = usePlans();
	const { invoices, isPending: isInvoicesPending } = useInvoices();
	const { data: session } = useSession(authClient);

	const isAdmin = session?.user?.role === "admin";

	return (
		<div className="flex flex-col gap-6">
			{/* Page Header */}
			<div className="flex flex-col gap-1">
				<Typography type="h2">Dashboard</Typography>
				<Typography type="body-sm" color="muted">
					Your API usage, subscription snapshot, and recent billing
					activity.
				</Typography>
			</div>

			{/* API Usage Metrics */}
			<section className="flex flex-col gap-3">
				<Typography type="h3">API Usage</Typography>
				<UsageSummaryCards />
			</section>

			{/* Monthly Quota */}
			<section className="flex flex-col gap-3">
				<Typography type="h3">Monthly Quota</Typography>
				<UsageQuotaCard />
			</section>

			{/* Current Subscription Snapshot */}
			<section className="flex flex-col gap-3">
				<Typography type="h3">Current Plan</Typography>
				<ActiveSubscriptionCard
					subscription={subscription}
					plans={plans}
					isPending={isSubPending}
				/>
			</section>

			{/* Quick Links */}
			<section className="flex flex-col gap-3">
				<Typography type="h3">Quick Links</Typography>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{QUICK_LINKS.map(
						({ title, description, url, icon: Icon }) => (
							<NextLink key={url} href={url} className="group">
								<Card
									variant="default"
									className="h-full transition-colors group-hover:bg-surface-secondary"
								>
									<Card.Content className="flex items-start gap-3 p-4">
										<div className="p-2 text-muted shrink-0">
											<Icon className="size-5" />
										</div>
										<div className="flex flex-col gap-0.5">
											<Typography
												type="body-sm"
												className="font-semibold"
											>
												{title}
											</Typography>
											<Typography
												type="body-xs"
												color="muted"
											>
												{description}
											</Typography>
										</div>
									</Card.Content>
								</Card>
							</NextLink>
						)
					)}
					{isAdmin && (
						<NextLink href="/admin" className="group">
							<Card
								variant="default"
								className="h-full transition-colors group-hover:bg-surface-secondary"
							>
								<Card.Content className="flex items-start gap-3 p-4">
									<div className="p-2 text-muted shrink-0">
										<Shield className="size-5" />
									</div>
									<div className="flex flex-col gap-0.5">
										<Typography
											type="body-sm"
											className="font-semibold"
										>
											Admin
										</Typography>
										<Typography
											type="body-xs"
											color="muted"
										>
											Platform command center
										</Typography>
									</div>
								</Card.Content>
							</Card>
						</NextLink>
					)}
				</div>
			</section>

			{/* Recent Invoices */}
			<section className="flex flex-col gap-3">
				<Typography type="h3">Recent Invoices</Typography>
				<InvoiceTable
					invoices={invoices.slice(0, 5)}
					showFilters={false}
					showPagination={false}
					isPending={isInvoicesPending}
					emptyMessage="No billing transactions recorded yet."
				/>
			</section>
		</div>
	);
};

HomePage.displayName = "HomePage";
