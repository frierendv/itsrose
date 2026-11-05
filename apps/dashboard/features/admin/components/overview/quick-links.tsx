"use client";

import {
	ArrowRotateRight,
	CreditCard,
	FileDollar,
	LayersVertical,
	Vault,
} from "@gravity-ui/icons";
import { Card, Typography } from "@heroui/react";
import NextLink from "next/link";
import { ADMIN_ROUTES } from "../../routes";

const SHORTCUTS = [
	{
		title: "Metering operations",
		description: "Flush counters, backfill tenants, run the cron",
		href: ADMIN_ROUTES.usageOperations,
		icon: ArrowRotateRight,
	},
	{
		title: "Usage rates",
		description: "Version unit prices per tier",
		href: ADMIN_ROUTES.usageRates,
		icon: FileDollar,
	},
	{
		title: "Settlements",
		description: "Freeze a period and issue invoices",
		href: ADMIN_ROUTES.usageSettlements,
		icon: Vault,
	},
	{
		title: "Plans",
		description: "Catalog, prices and quotas",
		href: ADMIN_ROUTES.billingPlans,
		icon: LayersVertical,
	},
	{
		title: "Subscriptions",
		description: "Overrides and cancellations",
		href: ADMIN_ROUTES.billingSubscriptions,
		icon: CreditCard,
	},
	{
		title: "Invoices",
		description: "Ledger, voids and payment links",
		href: ADMIN_ROUTES.billingInvoices,
		icon: FileDollar,
	},
] as const;

export const QuickLinks: React.FC = () => (
	<section className="flex flex-col gap-3">
		<Typography type="h3">Shortcuts</Typography>
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{SHORTCUTS.map(({ title, description, href, icon: Icon }) => (
				<NextLink className="group" href={href} key={href}>
					<Card
						className="h-full transition-colors group-hover:bg-surface-secondary"
						variant="default"
					>
						<Card.Content className="flex items-start gap-3 p-4">
							<div className="shrink-0 p-2 text-muted">
								<Icon className="size-5" />
							</div>
							<div className="flex flex-col gap-0.5">
								<Typography
									className="font-semibold"
									type="body-sm"
								>
									{title}
								</Typography>
								<Typography type="body-xs" color="muted">
									{description}
								</Typography>
							</div>
						</Card.Content>
					</Card>
				</NextLink>
			))}
		</div>
	</section>
);

QuickLinks.displayName = "QuickLinks";
