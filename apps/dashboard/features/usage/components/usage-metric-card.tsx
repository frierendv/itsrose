"use client";

import { Card, Skeleton, Typography } from "@heroui/react";

export type UsageMetricCardProps = {
	icon: React.ReactNode;
	label: string;
	/** `null` renders a skeleton while loading. */
	value: string | null;
	hint: string;
};

/**
 * Single metric tile used by the usage summary grid.
 */
export const UsageMetricCard: React.FC<UsageMetricCardProps> = ({
	icon,
	label,
	value,
	hint,
}) => (
	<Card variant="default">
		<Card.Header className="flex flex-row items-center justify-between pb-2">
			<Card.Title className="text-sm font-medium text-muted">
				{label}
			</Card.Title>
			<span className="text-muted shrink-0">{icon}</span>
		</Card.Header>
		<Card.Content className="flex flex-col gap-1">
			{value === null ? (
				<Skeleton className="h-8 w-28" />
			) : (
				<Typography type="h2">{value}</Typography>
			)}
			<Typography type="body-xs" color="muted">
				{hint}
			</Typography>
		</Card.Content>
	</Card>
);

UsageMetricCard.displayName = "UsageMetricCard";
