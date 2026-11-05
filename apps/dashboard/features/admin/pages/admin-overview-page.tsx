"use client";

import { useMemo } from "react";
import { AdminMetricsCards } from "../components/overview/admin-metrics-cards";
import { AttentionList } from "../components/overview/attention-list";
import { QuickLinks } from "../components/overview/quick-links";
import { RecentActivity } from "../components/overview/recent-activity";
import { AdminPage } from "../components/shell";
import {
	useAdminEvents,
	useAdminInvoices,
	useAdminPlans,
	useAdminSubscriptions,
} from "../hooks";
import { buildOverviewMetrics } from "../models";

const SAMPLE_CAP = 100;

export const AdminOverviewPage: React.FC = () => {
	const subscriptions = useAdminSubscriptions({
		status: "all",
		limit: SAMPLE_CAP,
	});
	const invoices = useAdminInvoices({ status: "all", limit: SAMPLE_CAP });
	const plans = useAdminPlans();
	const events = useAdminEvents({ limit: 10 });

	const isPending =
		subscriptions.isLoading || invoices.isLoading || plans.isLoading;

	const metrics = useMemo(
		() =>
			buildOverviewMetrics({
				subscriptions: subscriptions.subscriptions,
				invoices: invoices.invoices,
				plans: plans.plans,
				events: events.events,
				cap: SAMPLE_CAP,
			}),
		[
			events.events,
			invoices.invoices,
			plans.plans,
			subscriptions.subscriptions,
		]
	);

	return (
		<AdminPage
			description="Platform health at a glance: revenue, pending collections, subscriptions that need action and the latest gateway activity."
			title="Command center"
		>
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-2">
					<AdminMetricsCards
						isPending={isPending}
						metrics={metrics}
					/>
					<p className="text-xs text-muted">
						Computed from the latest {SAMPLE_CAP} subscriptions and
						invoices
						{metrics.sampled.truncated
							? " (the window is full, so totals may exclude older records)"
							: ""}
						.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<RecentActivity
						events={metrics.recent_events}
						isPending={events.isLoading}
					/>
					<AttentionList
						isPending={subscriptions.isLoading}
						items={metrics.attention}
					/>
				</div>

				<QuickLinks />
			</div>
		</AdminPage>
	);
};

AdminOverviewPage.displayName = "AdminOverviewPage";
