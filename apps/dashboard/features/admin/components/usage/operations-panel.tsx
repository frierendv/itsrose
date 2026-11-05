"use client";

import { Button, Card, Input, Typography } from "@heroui/react";
import { useState } from "react";
import {
	useFlushUsageMutation,
	useSyncTenantsMutation,
	useTriggerCronMutation,
} from "../../hooks";
import {
	buildCronOutcome,
	buildFlushOutcome,
	buildTenantSyncOutcome,
	type OperationOutcome,
} from "../../models";

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type OperationCardProps = {
	title: string;
	description: string;
	children: React.ReactNode;
	action: React.ReactNode;
	outcome?: OperationOutcome | null;
};

const OperationCard: React.FC<OperationCardProps> = ({
	title,
	description,
	children,
	action,
	outcome,
}) => (
	<Card className="h-full" variant="default">
		<Card.Header className="gap-1">
			<Card.Title>{title}</Card.Title>
			<Card.Description>{description}</Card.Description>
		</Card.Header>
		<Card.Content className="flex flex-col gap-4">
			<div className="flex flex-col gap-3">{children}</div>
			<div>{action}</div>
			{outcome ? (
				<div className="flex flex-col gap-2 rounded-medium border border-separator p-3 text-xs">
					{outcome.fields.map((field) => (
						<div
							className="flex items-center justify-between gap-3"
							key={field.label}
						>
							<span className="text-muted">{field.label}</span>
							<span className="font-medium">{field.value}</span>
						</div>
					))}
					{outcome.errors.length > 0 ? (
						<div className="flex flex-col gap-1 border-t border-separator pt-2">
							<Typography type="body-xs" color="muted">
								Errors
							</Typography>
							{outcome.errors.map((error) => (
								<span className="text-danger" key={error}>
									{error}
								</span>
							))}
						</div>
					) : null}
				</div>
			) : null}
		</Card.Content>
	</Card>
);

export const OperationsPanel: React.FC = () => {
	const flush = useFlushUsageMutation();
	const sync = useSyncTenantsMutation();
	const cron = useTriggerCronMutation();

	const [flushDays, setFlushDays] = useState("3");
	const [flushFrom, setFlushFrom] = useState("");
	const [flushTo, setFlushTo] = useState("");
	const [leadDays, setLeadDays] = useState("3");
	const [graceDays, setGraceDays] = useState("3");
	const [cronOutcome, setCronOutcome] = useState<OperationOutcome | null>(
		null
	);

	const usesRange = flushFrom.trim().length > 0 || flushTo.trim().length > 0;
	const rangeValid =
		!usesRange ||
		(DAY_PATTERN.test(flushFrom.trim()) &&
			DAY_PATTERN.test(flushTo.trim()));
	const daysValue = Number(flushDays);
	const daysValid =
		!usesRange &&
		Number.isFinite(daysValue) &&
		daysValue >= 1 &&
		daysValue <= 90;
	const canFlush = usesRange ? rangeValid : daysValid;

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<OperationCard
				action={
					<Button
						isDisabled={!canFlush}
						isPending={flush.isPending}
						size="sm"
						onPress={() =>
							void flush.mutateAsync(
								usesRange
									? {
											from: flushFrom.trim(),
											to: flushTo.trim(),
										}
									: { days: Math.trunc(daysValue) }
							)
						}
					>
						Flush counters
					</Button>
				}
				description="Projects the hot Redis counters into the durable rollup ledger. Monotonic and idempotent: re-running a day can never lower a row."
				outcome={flush.data ? buildFlushOutcome(flush.data) : null}
				title="Ledger flush"
			>
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-medium text-muted">
						Last N days
					</label>
					<Input
						disabled={usesRange}
						type="number"
						value={flushDays}
						variant="secondary"
						onChange={(e) => setFlushDays(e.target.value)}
					/>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<Input
						placeholder="From YYYY-MM-DD"
						value={flushFrom}
						variant="secondary"
						onChange={(e) => setFlushFrom(e.target.value)}
					/>
					<Input
						placeholder="To YYYY-MM-DD"
						value={flushTo}
						variant="secondary"
						onChange={(e) => setFlushTo(e.target.value)}
					/>
				</div>
				<Typography type="body-xs" color="muted">
					Leave the range blank to flush the last N UTC days. Ranges
					are capped at 90 days.
				</Typography>
			</OperationCard>

			<OperationCard
				action={
					<Button
						isPending={sync.isPending}
						size="sm"
						onPress={() => void sync.mutateAsync()}
					>
						Sync tenants
					</Button>
				}
				description="Creates the personal tenant row for every user that predates metering. Safe to re-run; existing rows are left untouched."
				outcome={sync.data ? buildTenantSyncOutcome(sync.data) : null}
				title="Tenant backfill"
			>
				<Typography type="body-xs" color="muted">
					New signups get their tenant from the signup hook; this
					backfills older accounts so settlement can resolve their
					plan.
				</Typography>
			</OperationCard>

			<OperationCard
				action={
					<Button
						isPending={cron.isPending}
						size="sm"
						onPress={async () => {
							try {
								const result = await cron.mutateAsync({
									lead_days: Number(leadDays) || 3,
									grace_days: Number(graceDays) || 3,
								});
								setCronOutcome(buildCronOutcome(result));
							} catch {
								// Handled by the hook.
							}
						}}
					>
						Run collection cron
					</Button>
				}
				description="Dispatches renewal invoices, tracks grace periods and sweeps expired subscriptions. Idempotent per subscription and period."
				outcome={cronOutcome}
				title="Collection cron"
			>
				<div className="grid grid-cols-2 gap-2">
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium text-muted">
							Lead days
						</label>
						<Input
							type="number"
							value={leadDays}
							variant="secondary"
							onChange={(e) => setLeadDays(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium text-muted">
							Grace days
						</label>
						<Input
							type="number"
							value={graceDays}
							variant="secondary"
							onChange={(e) => setGraceDays(e.target.value)}
						/>
					</div>
				</div>
			</OperationCard>
		</div>
	);
};

OperationsPanel.displayName = "OperationsPanel";
