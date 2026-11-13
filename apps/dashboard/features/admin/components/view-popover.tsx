"use client";

import { UserView } from "@better-auth-ui/heroui";
import { CircleInfo } from "@gravity-ui/icons";
import { Button, Popover, Skeleton, Tooltip } from "@heroui/react";
import React, { useState, type PropsWithChildren } from "react";
import { useAdminUser, useAdminUserSubscription } from "../hooks";
import { SubscriptionDetailOverview } from "./subscriptions/subscription-inspect-drawer";

export type ViewUserPopoverProps = PropsWithChildren<{
	userId?: string;
}>;
export const ViewUserPopover: React.FC<
	ViewUserPopoverProps & {
		showSubscription?: boolean;
	}
> = ({ userId, children, showSubscription = true }) => {
	const [isOpen, setIsOpen] = useState(false);

	const { isLoading, isEnabled, data: user } = useAdminUser(userId, isOpen);

	return (
		<Popover onOpenChange={setIsOpen} isOpen={isOpen}>
			<Popover.Trigger aria-label="View basic user info">
				{children ?? userId}
			</Popover.Trigger>
			<Popover.Content className="w-[320px]">
				<Popover.Dialog>
					<Popover.Arrow />
					<Popover.Heading>
						{isEnabled && isLoading ? (
							<Skeleton className="w-full h-14" />
						) : (
							<div className="flex items-center justify-between">
								{user && <UserView user={user} />}
								{showSubscription && (
									<ViewSubscriptionPopover userId={userId}>
										<Tooltip delay={0}>
											<Button
												size="sm"
												variant="ghost"
												isIconOnly
											>
												<CircleInfo aria-hidden />
											</Button>
											<Tooltip.Content>
												<Tooltip.Arrow />
												<p>View current subscription</p>
											</Tooltip.Content>
										</Tooltip>
									</ViewSubscriptionPopover>
								)}
							</div>
						)}
					</Popover.Heading>
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	);
};

export type ViewSubscriptionPopoverProps = ViewUserPopoverProps;
export const ViewSubscriptionPopover: React.FC<
	ViewSubscriptionPopoverProps
> = ({ userId, children }) => {
	const [isOpen, setIsOpen] = useState(false);
	const { data: subscription } = useAdminUserSubscription(userId, isOpen);

	return (
		<Popover onOpenChange={setIsOpen} isOpen={isOpen}>
			<Popover.Trigger aria-label="View basic user subcription">
				{children ?? userId}
			</Popover.Trigger>
			<Popover.Content>
				<Popover.Arrow />
				<Popover.Dialog>
					<Popover.Heading>
						Current subscription details
					</Popover.Heading>

					{subscription ? (
						<SubscriptionDetailOverview
							subscription={subscription}
						/>
					) : (
						<span>No subscription</span>
					)}
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	);
};
