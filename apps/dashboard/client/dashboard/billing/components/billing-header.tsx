"use client";

import { ArrowsRotateRight } from "@gravity-ui/icons";
import { Button, Spinner, Tooltip } from "@heroui/react";
import React, { memo } from "react";
import { PortalButton } from "./portal-button";

export type BillingHeaderProps = {
	isRefetching?: boolean;
	onRefresh: () => void;
};

export const BillingHeader = memo<BillingHeaderProps>(
	({ isRefetching, onRefresh }) => {
		return (
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
				<div>
					<h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
						Billing &amp; Subscription
					</h1>
					<p className="text-xs sm:text-sm text-muted mt-1">
						Manage your subscription plan, billing schedule, payment
						methods, and invoice history.
					</p>
				</div>

				<div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
					<Tooltip delay={0}>
						<Tooltip.Trigger aria-label="Refresh subscription status">
							<Button
								variant="outline"
								size="sm"
								isPending={isRefetching}
								isIconOnly
								onPress={onRefresh}
								aria-label="Refresh subscription status"
								className="shrink-0"
							>
								{isRefetching ? (
									<Spinner size="sm" />
								) : (
									<ArrowsRotateRight width={14} height={14} />
								)}
							</Button>
						</Tooltip.Trigger>
						<Tooltip.Content showArrow offset={8} placement="top">
							<Tooltip.Arrow />
							<p className="text-xs">Refresh status</p>
						</Tooltip.Content>
					</Tooltip>

					<PortalButton
						size="sm"
						variant="outline"
						className="text-xs w-full sm:w-auto"
					/>
				</div>
			</div>
		);
	}
);

BillingHeader.displayName = "BillingHeader";
