"use client";

import { Code } from "@gravity-ui/icons";
import { Card, Skeleton, Typography } from "@heroui/react";
import {
	DEFAULT_BREAKDOWN_DAYS,
	useUsageBreakdown,
} from "../hooks/use-usage-breakdown";
import { endpointBreakdownModel } from "../utils";

export type UsageTopEndpointsCardProps = {
	days?: number;
	/** Number of endpoints shown before collapsing into "+N more". */
	limit?: number;
};

/**
 * Successful-request leaderboard by route template.
 *
 * Reads the `endpoint` dimension, which is the Fastify route template rather
 * than a raw URL, so the list stays bounded and free of ids or query strings.
 */
export const UsageTopEndpointsCard: React.FC<UsageTopEndpointsCardProps> = ({
	days = DEFAULT_BREAKDOWN_DAYS,
	limit = 5,
}) => {
	const { slices, isPending, isError } = useUsageBreakdown("endpoint", days);

	if (isPending) {
		return <UsageTopEndpointsCardSkeleton />;
	}

	const model = endpointBreakdownModel(slices, limit);

	return (
		<Card variant="default">
			<Card.Header className="flex flex-row items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<Card.Title>Top endpoints</Card.Title>
					<Card.Description>
						Successful requests, last {days} days
					</Card.Description>
				</div>
				<Typography type="body-sm" className="shrink-0 font-semibold">
					{model.total_label}
				</Typography>
			</Card.Header>

			<Card.Content>
				{isError ? (
					<Typography type="body-sm" color="muted">
						Endpoint data is temporarily unavailable.
					</Typography>
				) : model.is_empty ? (
					<div className="flex flex-col items-center justify-center gap-2 py-8">
						<span className="text-muted">
							<Code className="size-5" />
						</span>
						<Typography type="body-sm" color="muted">
							No successful requests recorded yet.
						</Typography>
					</div>
				) : (
					<>
						<ul className="flex flex-col gap-3">
							{model.slices.map((slice) => (
								<li
									key={slice.key}
									className="flex flex-col gap-1.5"
								>
									<div className="flex items-center justify-between gap-3">
										<Typography
											type="body-sm"
											className="truncate font-medium"
											title={slice.key}
										>
											{slice.key}
										</Typography>
										<Typography
											type="body-xs"
											color="muted"
											className="shrink-0 tabular-nums"
										>
											{slice.count_label} ·{" "}
											{slice.share_label}
										</Typography>
									</div>
									<div
										aria-label={`${slice.key}: ${slice.share_label} of requests`}
										aria-valuemax={100}
										aria-valuemin={0}
										aria-valuenow={Math.round(
											slice.share_pct
										)}
										className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10"
										role="progressbar"
									>
										<div
											className="h-full rounded-full bg-accent"
											style={{
												width: `${Math.max(slice.width_pct, 1)}%`,
											}}
										/>
									</div>
								</li>
							))}
						</ul>

						{model.hidden_count > 0 ? (
							<Typography
								type="body-xs"
								color="muted"
								className="mt-3"
							>
								+{model.hidden_count} more endpoint
								{model.hidden_count === 1 ? "" : "s"}
							</Typography>
						) : null}
					</>
				)}
			</Card.Content>
		</Card>
	);
};

UsageTopEndpointsCard.displayName = "UsageTopEndpointsCard";

export const UsageTopEndpointsCardSkeleton: React.FC = () => (
	<Card variant="default">
		<Card.Header className="flex flex-row items-start justify-between gap-4">
			<div className="space-y-2">
				<Skeleton className="h-6 w-32" />
				<Skeleton className="h-4 w-48" />
			</div>
			<Skeleton className="h-4 w-20" />
		</Card.Header>
		<Card.Content className="space-y-3">
			<Skeleton className="h-8 w-full" />
			<Skeleton className="h-8 w-full" />
			<Skeleton className="h-8 w-full" />
		</Card.Content>
	</Card>
);

UsageTopEndpointsCardSkeleton.displayName = "UsageTopEndpointsCardSkeleton";
