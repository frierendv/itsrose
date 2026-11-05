"use client";

import { Button } from "@heroui/react";
import { useState } from "react";
import { AdminPage } from "../components/shell";
import { SettleDialog } from "../components/usage/settle-dialog";
import { SettlementResultCard } from "../components/usage/settlement-result";
import { SettlementTable } from "../components/usage/settlement-table";
import { useSettleUsageMutation } from "../hooks";
import { buildMonthOptions } from "../models";

export const AdminSettlementsPage: React.FC = () => {
	const [dialogOpen, setDialogOpen] = useState(false);
	const mutation = useSettleUsageMutation();
	const months = buildMonthOptions(new Date(), 6);
	const defaultPeriod = months[1]?.id ?? months[0]?.id ?? "";

	return (
		<AdminPage
			actions={
				<Button size="sm" onPress={() => setDialogOpen(true)}>
					Run settlement
				</Button>
			}
			description="Freeze a period's metered usage into settlement rows and, when confirmed, issue the matching invoices. Dry runs are the default."
			title="Settlements"
		>
			<div className="flex flex-col gap-4">
				{mutation.data ? (
					<SettlementResultCard result={mutation.data} />
				) : null}
				<SettlementTable />
			</div>

			<SettleDialog
				defaultPeriod={defaultPeriod}
				isOpen={dialogOpen}
				isPending={mutation.isPending}
				months={months}
				onOpenChange={setDialogOpen}
				onSettle={async (input) => {
					try {
						await mutation.mutateAsync(input);
						setDialogOpen(false);
					} catch {
						// Handled by the hook.
					}
				}}
			/>
		</AdminPage>
	);
};

AdminSettlementsPage.displayName = "AdminSettlementsPage";
