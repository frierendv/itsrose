"use client";

import { Card, Skeleton } from "@heroui/react";
import { cn } from "@itsrose/react/core";
import React, { memo } from "react";
import type { StatCardProps } from "../../types";

export const StatCard = memo<StatCardProps>((props) => {
	const {
		title,
		icon: Icon,
		value,
		description,
		badge,
		isPending = false,
		className,
	} = props;
	if (isPending) {
		return <Skeleton className={cn("h-32", className)} />;
	}

	return (
		<Card
			className={cn(
				"h-full transition-all duration-200 hover:border-border",
				className
			)}
		>
			<Card.Header className="pb-2">
				<div className="flex items-center justify-between gap-2">
					<Card.Title className="text-xs font-semibold uppercase tracking-wider text-muted">
						{title}
					</Card.Title>
					<div className="p-1.5 text-accent shrink-0">
						<Icon width={16} height={16} />
					</div>
				</div>
			</Card.Header>

			<Card.Content className="py-1">
				<div className="text-lg sm:text-xl font-bold text-foreground tracking-tight truncate">
					{value}
				</div>
			</Card.Content>

			<Card.Footer className="pt-2 flex items-center justify-between gap-2 text-xs text-muted">
				{description && (
					<div className="flex items-center gap-1.5 truncate">
						{description}
					</div>
				)}
				{badge && <div className="shrink-0">{badge}</div>}
			</Card.Footer>
		</Card>
	);
});

StatCard.displayName = "StatCard";
