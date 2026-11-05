"use client";

import { Card, Skeleton, Typography } from "@heroui/react";

export type MetricCardProps = {
	label: string;
	/** `null` renders a skeleton while loading. */
	value: string | null;
	hint?: string;
	icon?: React.ReactNode;
	footnote?: React.ReactNode;
};

export const MetricCard: React.FC<MetricCardProps> = ({
	label,
	value,
	hint,
	icon,
	footnote,
}) => (
	<Card variant="default">
		<Card.Header className="flex flex-row items-center justify-between pb-2">
			<Card.Title className="text-sm font-medium text-muted">
				{label}
			</Card.Title>
			{icon ? <span className="text-muted shrink-0">{icon}</span> : null}
		</Card.Header>
		<Card.Content className="flex flex-col gap-1">
			{value === null ? (
				<Skeleton className="h-8 w-28" />
			) : (
				<Typography type="h2">{value}</Typography>
			)}
			{hint ? (
				<Typography type="body-xs" color="muted">
					{hint}
				</Typography>
			) : null}
			{footnote}
		</Card.Content>
	</Card>
);

MetricCard.displayName = "MetricCard";

export type MetricGridProps = {
	children: React.ReactNode;
	/** Columns at the largest breakpoint. Defaults to 4. */
	columns?: 3 | 4;
};

export const MetricGrid: React.FC<MetricGridProps> = ({
	children,
	columns = 4,
}) => (
	<div
		className={
			columns === 3
				? "grid grid-cols-1 gap-4 sm:grid-cols-3"
				: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
		}
	>
		{children}
	</div>
);

MetricGrid.displayName = "MetricGrid";
