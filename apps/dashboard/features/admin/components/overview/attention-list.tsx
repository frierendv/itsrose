"use client";

import { ArrowRight } from "@gravity-ui/icons";
import {
	buttonVariants,
	Card,
	Chip,
	Skeleton,
	Typography,
} from "@heroui/react";
import NextLink from "next/link";
import type { OverviewAttentionItem } from "../../models";
import { ADMIN_ROUTES } from "../../routes";
import { formatDate, getSubscriptionStatusProps } from "../../utils";

export type AttentionListProps = {
	items: readonly OverviewAttentionItem[];
	isPending?: boolean;
};

/**
 * Subscriptions that need an operator: past due or expired.
 */
export const AttentionList: React.FC<AttentionListProps> = ({
	items,
	isPending = false,
}) => (
	<Card className="h-full" variant="default">
		<Card.Header className="flex flex-row items-start justify-between gap-3">
			<div className="flex flex-col gap-1">
				<Card.Title>Needs attention</Card.Title>
				<Card.Description>
					Past due or expired subscriptions
				</Card.Description>
			</div>
			<NextLink
				className={buttonVariants({ size: "sm", variant: "ghost" })}
				href={`${ADMIN_ROUTES.billingSubscriptions}?status=past_due`}
			>
				<span>Open subscriptions</span>
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
			) : items.length === 0 ? (
				<Typography type="body-sm" color="muted">
					Every subscription is healthy.
				</Typography>
			) : (
				items.map((item) => {
					const props = getSubscriptionStatusProps(item.status);
					return (
						<div
							className="flex items-center justify-between gap-3 border-b border-separator pb-2 last:border-0 last:pb-0"
							key={item.id}
						>
							<div className="flex min-w-0 flex-col gap-0.5">
								<span className="truncate font-mono text-xs font-medium">
									{item.user_id}
								</span>
								<span className="text-xs text-muted">
									{item.plan_id} · ends{" "}
									{formatDate(item.period_end)}
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

AttentionList.displayName = "AttentionList";
