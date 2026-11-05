"use client";

import {
	CreditCard,
	LayersVertical,
	Receipt,
	TriangleExclamation,
} from "@gravity-ui/icons";
import type { OverviewMetrics } from "../../models";
import { MetricCard, MetricGrid } from "../shell";

export type AdminMetricsCardsProps = {
	metrics: OverviewMetrics | null;
	isPending?: boolean;
};

/**
 * Platform KPIs for the command center.
 */
export const AdminMetricsCards: React.FC<AdminMetricsCardsProps> = ({
	metrics,
	isPending = false,
}) => (
	<MetricGrid>
		<MetricCard
			footnote={
				metrics ? (
					<span className="text-xs text-muted">
						Total platform accounts:{" "}
						<strong className="text-foreground">
							{metrics.total_subscriptions}
						</strong>
					</span>
				) : null
			}
			hint="Paid subscriptions in the fetched window"
			icon={<LayersVertical className="size-4" />}
			label="Active subscriptions"
			value={
				isPending || !metrics
					? null
					: String(metrics.active_subscriptions)
			}
		/>
		<MetricCard
			footnote={
				metrics ? (
					<span className="text-xs text-muted">
						Lifetime gross:{" "}
						<strong className="text-foreground">
							{metrics.lifetime_revenue_label}
						</strong>
					</span>
				) : null
			}
			hint="Monthly-normalised, yearly plans divided by 12"
			icon={<CreditCard className="size-4" />}
			label="Estimated MRR"
			value={isPending || !metrics ? null : metrics.mrr_label}
		/>
		<MetricCard
			footnote={
				metrics ? (
					<span className="text-xs text-muted">
						Uncollected:{" "}
						<strong className="text-foreground">
							{metrics.pending_amount_label}
						</strong>
					</span>
				) : null
			}
			hint="Pending or unpaid invoices"
			icon={<Receipt className="size-4" />}
			label="Pending invoices"
			value={
				isPending || !metrics ? null : String(metrics.pending_invoices)
			}
		/>
		<MetricCard
			hint="Past due or expired subscriptions"
			icon={<TriangleExclamation className="size-4" />}
			label="Attention needed"
			value={
				isPending || !metrics ? null : String(metrics.attention_count)
			}
		/>
	</MetricGrid>
);

AdminMetricsCards.displayName = "AdminMetricsCards";
