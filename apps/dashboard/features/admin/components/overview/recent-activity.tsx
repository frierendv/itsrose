"use client";

import { ArrowRight } from "@gravity-ui/icons";
import {
	buttonVariants,
	Card,
	Chip,
	Skeleton,
	Typography,
} from "@heroui/react";
import type { TransactionInvoiceEvent } from "@itsrose/auth-billing";
import NextLink from "next/link";
import { ADMIN_ROUTES } from "../../routes";
import { formatDateTime, getEventStatusProps } from "../../utils";

export type RecentActivityProps = {
	events: readonly TransactionInvoiceEvent[];
	isPending?: boolean;
};

/**
 * Latest transaction events, linking to the full event log.
 */
export const RecentActivity: React.FC<RecentActivityProps> = ({
	events,
	isPending = false,
}) => (
	<Card className="h-full" variant="default">
		<Card.Header className="flex flex-row items-start justify-between gap-3">
			<div className="flex flex-col gap-1">
				<Card.Title>Recent activity</Card.Title>
				<Card.Description>
					Latest gateway callbacks and lifecycle events
				</Card.Description>
			</div>
			<NextLink
				className={buttonVariants({ size: "sm", variant: "ghost" })}
				href={ADMIN_ROUTES.billingEvents}
			>
				<span>All events</span>
				<ArrowRight aria-hidden />
			</NextLink>
		</Card.Header>
		<Card.Content className="flex flex-col gap-2">
			{isPending ? (
				<>
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</>
			) : events.length === 0 ? (
				<Typography type="body-sm" color="muted">
					No transaction events recorded yet.
				</Typography>
			) : (
				events.map((event) => {
					const props = getEventStatusProps(event.event_name);
					return (
						<div
							className="flex items-center justify-between gap-3 border-b border-separator pb-2 last:border-0 last:pb-0"
							key={
								event.id ??
								`${event.event_name}-${event.created_at}`
							}
						>
							<div className="flex min-w-0 flex-col gap-0.5">
								<span className="truncate font-mono text-xs font-medium">
									{event.event_name}
								</span>
								<span className="text-xs text-muted">
									{formatDateTime(event.created_at)}
								</span>
							</div>
							<Chip color={props.color} size="sm" variant="soft">
								{props.label}
							</Chip>
						</div>
					);
				})
			)}
		</Card.Content>
	</Card>
);

RecentActivity.displayName = "RecentActivity";
