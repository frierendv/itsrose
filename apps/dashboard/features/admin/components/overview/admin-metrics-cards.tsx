"use client";

import {
	CreditCard,
	LayersVertical,
	Receipt,
	TriangleExclamation,
} from "@gravity-ui/icons";
import { Card, Chip, Skeleton, Typography } from "@heroui/react";
import {
	useAdminInvoices,
	useAdminPlans,
	useAdminSubscriptions,
} from "../../hooks";
import { formatIDR } from "../../utils";

export const AdminMetricsCards: React.FC = () => {
	const { subscriptions, isLoading: isLoadingSubs } = useAdminSubscriptions();
	const { invoices, isLoading: isLoadingInvoices } = useAdminInvoices();
	const { plans, isLoading: isLoadingPlans } = useAdminPlans();

	const isLoading = isLoadingSubs || isLoadingInvoices || isLoadingPlans;

	if (isLoading) {
		return (
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card
						key={`metric-skel-${i}`}
						variant="default"
						className="p-4"
					>
						<div className="flex flex-col gap-3">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-8 w-36" />
							<Skeleton className="h-3 w-48" />
						</div>
					</Card>
				))}
			</div>
		);
	}

	// Active Subscriptions
	const activeSubs = subscriptions.filter(
		(s) => (s.status || "").toLowerCase() === "active"
	);
	const pastDueSubs = subscriptions.filter(
		(s) => (s.status || "").toLowerCase() === "past_due"
	);
	const expiredSubs = subscriptions.filter((s) => {
		const st = (s.status || "").toLowerCase();
		return st === "expired" || st === "canceled";
	});

	// Estimated MRR (sum of prices for active subscriptions)
	const planPriceMap = new Map<string, number>();
	plans.forEach((p) => {
		planPriceMap.set(p.plan_id.toLowerCase(), p.price?.amount || 0);
	});

	const estimatedMRR = activeSubs.reduce((acc, sub) => {
		const price = planPriceMap.get((sub.plan_id || "").toLowerCase()) || 0;
		return acc + price;
	}, 0);

	// Pending Invoices
	const pendingInvoices = invoices.filter((inv) => {
		const st = (inv.status || "").toLowerCase();
		return st === "pending" || st === "unpaid";
	});
	const pendingAmount = pendingInvoices.reduce(
		(acc, inv) => acc + inv.gross_amount,
		0
	);

	// Settled / Paid Invoices
	const paidInvoices = invoices.filter((inv) => {
		const st = (inv.status || "").toLowerCase();
		return st === "paid" || st === "settlement";
	});
	const totalPaidRevenue = paidInvoices.reduce(
		(acc, inv) => acc + inv.gross_amount,
		0
	);

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{/* Metric Active Subscriptions */}
			<Card variant="default">
				<Card.Header className="flex flex-row items-center justify-between pb-2">
					<Card.Title className="text-sm font-medium text-muted">
						Active Subscriptions
					</Card.Title>
					<LayersVertical className="size-4 text-muted" />
				</Card.Header>
				<Card.Content className="flex flex-col gap-1">
					<Typography type="h2">{activeSubs.length}</Typography>
					<div className="flex items-center gap-1.5 pt-1 text-xs text-muted">
						<span>Total platform accounts:</span>
						<strong className="text-foreground">
							{subscriptions.length}
						</strong>
					</div>
				</Card.Content>
			</Card>

			{/* Metric Estimated MRR */}
			<Card variant="default">
				<Card.Header className="flex flex-row items-center justify-between pb-2">
					<Card.Title className="text-sm font-medium text-muted">
						Estimated MRR
					</Card.Title>
					<CreditCard className="size-4 text-muted" />
				</Card.Header>
				<Card.Content className="flex flex-col gap-1">
					<Typography type="h2">{formatIDR(estimatedMRR)}</Typography>
					<div className="flex items-center gap-1.5 pt-1 text-xs text-muted">
						<span>Lifetime Gross:</span>
						<strong className="text-foreground">
							{formatIDR(totalPaidRevenue)}
						</strong>
					</div>
				</Card.Content>
			</Card>

			{/* Metric Pending Invoices */}
			<Card variant="default">
				<Card.Header className="flex flex-row items-center justify-between pb-2">
					<Card.Title className="text-sm font-medium text-muted">
						Pending Invoices
					</Card.Title>
					<Receipt className="size-4 text-muted" />
				</Card.Header>
				<Card.Content className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<Typography type="h2">
							{pendingInvoices.length}
						</Typography>
						{pendingInvoices.length > 0 && (
							<Chip color="warning" size="sm" variant="soft">
								Awaiting Pay
							</Chip>
						)}
					</div>
					<div className="flex items-center gap-1.5 pt-1 text-xs text-muted">
						<span>Uncollected:</span>
						<strong className="text-foreground">
							{formatIDR(pendingAmount)}
						</strong>
					</div>
				</Card.Content>
			</Card>

			{/* Metric Attention Needed (Past Due / Expired) */}
			<Card variant="default">
				<Card.Header className="flex flex-row items-center justify-between pb-2">
					<Card.Title className="text-sm font-medium text-muted">
						Attention Needed
					</Card.Title>
					<TriangleExclamation className="size-4 text-muted" />
				</Card.Header>
				<Card.Content className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<Typography type="h2">
							{pastDueSubs.length + expiredSubs.length}
						</Typography>
						{pastDueSubs.length > 0 && (
							<Chip color="danger" size="sm" variant="soft">
								{pastDueSubs.length} Past Due
							</Chip>
						)}
					</div>
					<div className="flex items-center gap-1.5 pt-1 text-xs text-muted">
						<span>In grace period or expired subscriptions</span>
					</div>
				</Card.Content>
			</Card>
		</div>
	);
};

AdminMetricsCards.displayName = "AdminMetricsCards";
