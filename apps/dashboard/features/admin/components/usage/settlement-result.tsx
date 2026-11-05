"use client";

import { Card, Chip, Typography } from "@heroui/react";
import type { SettlementResult } from "@itsrose/auth-usage";
import { buildSettlementSummary } from "../../models";
import { getSettlementStatusProps } from "../../utils";

export type SettlementResultCardProps = {
	result: SettlementResult;
};

/**
 * Outcome of the last settlement run: totals plus every skipped/failed tenant.
 */
export const SettlementResultCard: React.FC<SettlementResultCardProps> = ({
	result,
}) => {
	const summary = buildSettlementSummary(result);

	return (
		<Card variant="default">
			<Card.Header className="flex flex-row items-start justify-between gap-3">
				<div className="flex flex-col gap-1">
					<Card.Title>
						Settlement result · {summary.period}
					</Card.Title>
					<Card.Description>
						{summary.tenant_count} tenant(s) · {summary.units_label}{" "}
						{summary.unit}(s) · {summary.amount_label}
					</Card.Description>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-2">
					<Chip
						color={
							summary.invoices_created > 0 ? "success" : "default"
						}
						size="sm"
						variant="soft"
					>
						{summary.invoices_created} invoice(s) created
					</Chip>
					{summary.skipped > 0 ? (
						<Chip color="warning" size="sm" variant="soft">
							{summary.skipped} skipped
						</Chip>
					) : null}
					{summary.failed > 0 ? (
						<Chip color="danger" size="sm" variant="soft">
							{summary.failed} failed
						</Chip>
					) : null}
				</div>
			</Card.Header>
			<Card.Content className="flex flex-col gap-3">
				{summary.is_clean ? (
					<Typography type="body-sm" color="muted">
						Every tenant settled cleanly.
					</Typography>
				) : (
					<ul className="flex flex-col gap-2">
						{summary.problems.map((problem) => {
							const props = getSettlementStatusProps(
								problem.status
							);
							return (
								<li
									className="flex flex-wrap items-center justify-between gap-2 border-b border-separator pb-2 text-xs last:border-0 last:pb-0"
									key={`${problem.tenant_id}-${problem.status}`}
								>
									<div className="flex flex-col gap-0.5">
										<span className="font-mono">
											{problem.tenant_id}
										</span>
										<span className="text-muted">
											{problem.reason ?? "—"}
										</span>
									</div>
									<Chip
										color={props.color}
										size="sm"
										variant="soft"
									>
										{props.label}
									</Chip>
								</li>
							);
						})}
					</ul>
				)}
			</Card.Content>
		</Card>
	);
};

SettlementResultCard.displayName = "SettlementResultCard";
