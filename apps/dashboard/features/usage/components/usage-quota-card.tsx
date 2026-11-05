"use client";

import { LayersVertical } from "@gravity-ui/icons";
import { Card, Chip, ProgressBar, Skeleton, Typography } from "@heroui/react";
import { useUsageQuota } from "../hooks/use-usage-quota";
import { formatQuotaLimit, formatUsagePeriod, quotaCardModel } from "../utils";

const TONE_TO_CHIP = {
	success: "success",
	warning: "warning",
	danger: "danger",
} as const;

/**
 * Monthly quota card.
 *
 * Soft mode is informational (the API still serves traffic and reports the
 * overshoot); hard mode blocks with `429 QUOTA_EXCEEDED`, which is why the mode
 * is surfaced as a chip rather than hidden.
 */
export const UsageQuotaCard: React.FC = () => {
	const { quota, isPending, isError } = useUsageQuota();

	if (isPending) {
		return <UsageQuotaCardSkeleton />;
	}

	if (isError || !quota) {
		return (
			<Card variant="default">
				<Card.Header className="flex flex-row items-center justify-between gap-4">
					<Card.Title>Monthly quota</Card.Title>
					<span className="text-muted shrink-0">
						<LayersVertical className="size-4" />
					</span>
				</Card.Header>
				<Card.Content>
					<Typography type="body-sm" color="muted">
						Quota information is temporarily unavailable.
					</Typography>
				</Card.Content>
			</Card>
		);
	}

	const model = quotaCardModel(quota);

	return (
		<Card variant="default">
			<Card.Header className="flex flex-row items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<Card.Title>Monthly quota</Card.Title>
					<Card.Description>
						{formatUsagePeriod(quota.period)} ·{" "}
						{formatQuotaLimit(quota.limit)}
					</Card.Description>
				</div>
				<div className="flex shrink-0 flex-row items-center gap-2">
					{model.is_unlimited ? (
						<Chip color="success" size="sm" variant="soft">
							Unlimited
						</Chip>
					) : (
						<Chip
							color={TONE_TO_CHIP[model.tone]}
							size="sm"
							variant="soft"
						>
							{model.percent_label}
						</Chip>
					)}
					<Chip
						color={quota.mode === "hard" ? "danger" : "default"}
						size="sm"
						variant="soft"
					>
						{model.mode_label}
					</Chip>
				</div>
			</Card.Header>

			<Card.Content className="flex flex-col gap-4">
				{model.is_unlimited ? (
					<Typography type="body-sm" color="muted">
						{model.copy}
					</Typography>
				) : (
					<>
						<div className="flex flex-wrap items-baseline justify-between gap-2">
							<div className="flex items-baseline gap-1.5">
								<Typography type="h2">
									{model.used_label}
								</Typography>
								<Typography type="body-sm" color="muted">
									{model.limit_label}
								</Typography>
							</div>
							<Typography type="body-xs" color="muted">
								{model.reset_label}
							</Typography>
						</div>

						<ProgressBar
							aria-label="Monthly quota usage"
							color={model.tone}
							maxValue={quota.limit ?? 100}
							value={Math.min(quota.used, quota.limit ?? 100)}
							size="md"
						>
							<ProgressBar.Track>
								<ProgressBar.Fill />
							</ProgressBar.Track>
						</ProgressBar>

						<div className="flex flex-col gap-1">
							<Typography type="body-sm">
								{model.remaining_label}
							</Typography>
							<Typography type="body-xs" color="muted">
								{model.copy}
							</Typography>
						</div>
					</>
				)}
			</Card.Content>
		</Card>
	);
};

UsageQuotaCard.displayName = "UsageQuotaCard";

export const UsageQuotaCardSkeleton: React.FC = () => (
	<Card variant="default">
		<Card.Header className="flex flex-row items-center justify-between gap-4">
			<div className="space-y-2">
				<Skeleton className="h-6 w-36" />
				<Skeleton className="h-4 w-56" />
			</div>
			<Skeleton className="h-6 w-20" />
		</Card.Header>
		<Card.Content className="space-y-4">
			<Skeleton className="h-8 w-40" />
			<Skeleton className="h-3 w-full" />
			<Skeleton className="h-4 w-52" />
		</Card.Content>
	</Card>
);

UsageQuotaCardSkeleton.displayName = "UsageQuotaCardSkeleton";
