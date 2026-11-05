"use client";

import { ChartLine } from "@gravity-ui/icons";
import { Card, Skeleton, Typography } from "@heroui/react";
import {
	DEFAULT_TREND_DAYS,
	useUsageTimeseries,
} from "../hooks/use-usage-timeseries";
import { trendCardModel } from "../utils";

export type UsageTrendCardProps = {
	days?: number;
};

/**
 * Daily request trend as a two-bar-per-day column chart.
 *
 * Rendered with plain elements instead of a chart library: seven buckets do not
 * justify a new dependency, and the bars stay keyboard/screen-reader friendly
 * because each column carries its own label.
 */
export const UsageTrendCard: React.FC<UsageTrendCardProps> = ({
	days = DEFAULT_TREND_DAYS,
}) => {
	const { points, isPending, isError } = useUsageTimeseries(days);

	if (isPending) {
		return <UsageTrendCardSkeleton />;
	}

	const model = trendCardModel(points);

	return (
		<Card variant="default">
			<Card.Header className="flex flex-row items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<Card.Title>Usage trend</Card.Title>
					<Card.Description>
						Daily requests, last {days} days
					</Card.Description>
				</div>
				<div className="flex shrink-0 flex-col items-end gap-0.5">
					<Typography type="body-sm" className="font-semibold">
						{model.total_label}
					</Typography>
					<Typography type="body-xs" color="muted">
						{model.billable_label}
					</Typography>
				</div>
			</Card.Header>

			<Card.Content className="flex flex-col gap-4">
				{isError ? (
					<Typography type="body-sm" color="muted">
						Trend data is temporarily unavailable.
					</Typography>
				) : model.is_empty ? (
					<div className="flex flex-col items-center justify-center gap-2 py-8">
						<span className="text-muted">
							<ChartLine className="size-5" />
						</span>
						<Typography type="body-sm" color="muted">
							No requests recorded in the last {days} days.
						</Typography>
					</div>
				) : (
					<>
						<div
							aria-label={`Daily requests for the last ${days} days`}
							className="flex h-32 items-end gap-2"
							role="img"
						>
							{model.bars.map((bar) => (
								<div
									key={bar.date}
									className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
								>
									<div
										className="flex h-24 w-full items-end justify-center gap-0.5"
										title={bar.tooltip}
									>
										<div
											aria-label={bar.tooltip}
											className="w-1/2 rounded-t bg-foreground/15"
											role="img"
											style={{
												height: `${Math.max(bar.total_pct, 2)}%`,
											}}
										/>
										<div
											aria-label={`${bar.label}: ${bar.tooltip}`}
											className="w-1/2 rounded-t bg-accent"
											role="img"
											style={{
												height: `${Math.max(bar.billable_pct, 2)}%`,
											}}
										/>
									</div>
									<Typography
										type="body-xs"
										color="muted"
										className="w-full truncate text-center"
									>
										{bar.label}
									</Typography>
								</div>
							))}
						</div>

						<div className="flex items-center gap-4">
							<LegendDot label="Total" tone="muted" />
							<LegendDot label="Billable" tone="accent" />
							{model.peak_label ? (
								<Typography
									type="body-xs"
									color="muted"
									className="ms-auto"
								>
									Peak {model.peak_label}
								</Typography>
							) : null}
						</div>
					</>
				)}
			</Card.Content>
		</Card>
	);
};

UsageTrendCard.displayName = "UsageTrendCard";

const LegendDot: React.FC<{ label: string; tone: "muted" | "accent" }> = ({
	label,
	tone,
}) => (
	<span className="flex items-center gap-1.5">
		<span
			aria-hidden
			className={
				tone === "accent"
					? "size-2 rounded-full bg-accent"
					: "size-2 rounded-full bg-foreground/25"
			}
		/>
		<Typography type="body-xs" color="muted">
			{label}
		</Typography>
	</span>
);

export const UsageTrendCardSkeleton: React.FC = () => (
	<Card variant="default">
		<Card.Header className="flex flex-row items-start justify-between gap-4">
			<div className="space-y-2">
				<Skeleton className="h-6 w-32" />
				<Skeleton className="h-4 w-44" />
			</div>
			<Skeleton className="h-4 w-24" />
		</Card.Header>
		<Card.Content>
			<Skeleton className="h-32 w-full" />
		</Card.Content>
	</Card>
);

UsageTrendCardSkeleton.displayName = "UsageTrendCardSkeleton";

LegendDot.displayName = "LegendDot";
