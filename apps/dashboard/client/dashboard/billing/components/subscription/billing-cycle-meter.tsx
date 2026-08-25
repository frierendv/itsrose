"use client";

import { Calendar } from "@gravity-ui/icons";
import { Card, Meter } from "@heroui/react";
import { differenceInCalendarDays, format } from "date-fns";
import React, { memo, useMemo } from "react";

export type BillingCycleMeterProps = {
	startDate?: Date | string | null;
	endDate?: Date | string | null;
	className?: string;
};

export const BillingCycleMeter = memo<BillingCycleMeterProps>(
	({ startDate, endDate, className }) => {
		const { validPeriod, progress, cycleText, remainingText } =
			useMemo(() => {
				if (!startDate || !endDate) {
					return {
						validPeriod: false,
						progress: 0,
						cycleText: "No active cycle",
						remainingText: "Active plan",
					};
				}

				const start = new Date(startDate);
				const end = new Date(endDate);
				const now = new Date();

				if (
					isNaN(start.getTime()) ||
					isNaN(end.getTime()) ||
					end.getTime() <= start.getTime()
				) {
					return {
						validPeriod: false,
						progress: 0,
						cycleText: "Standard billing",
						remainingText: "Active",
					};
				}

				const totalDuration = end.getTime() - start.getTime();
				const elapsed = now.getTime() - start.getTime();
				const calculatedProgress = Math.min(
					100,
					Math.max(0, (elapsed / totalDuration) * 100)
				);

				const daysLeft = differenceInCalendarDays(end, now);
				const remaining =
					daysLeft >= 0
						? `${daysLeft} days remaining`
						: "Period ended";

				return {
					validPeriod: true,
					progress: Math.round(calculatedProgress),
					cycleText: `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`,
					remainingText: remaining,
				};
			}, [startDate, endDate]);

		if (!validPeriod) {
			return null;
		}

		return (
			<Card
				className={`border border-accent/20 bg-accent/5 ${className || ""}`}
			>
				<Card.Header className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2">
					<Card.Title className="flex items-center gap-2 text-xs font-semibold text-foreground">
						<Calendar
							width={14}
							height={14}
							className="text-accent"
						/>
						<span>Current Billing Cycle</span>
					</Card.Title>
					<span className="text-xs text-muted font-medium">
						{cycleText}
					</span>
				</Card.Header>

				<Card.Content className="py-1">
					<Meter
						aria-label="Current Cycle Progress"
						size="sm"
						value={progress}
					>
						<Meter.Track className="bg-border/60">
							<Meter.Fill className="bg-accent transition-all duration-500" />
						</Meter.Track>
					</Meter>
				</Card.Content>

				<Card.Footer className="pt-1 flex items-center justify-between text-[11px] text-muted">
					<span>{progress}% elapsed</span>
					<span>{remainingText}</span>
				</Card.Footer>
			</Card>
		);
	}
);

BillingCycleMeter.displayName = "BillingCycleMeter";
