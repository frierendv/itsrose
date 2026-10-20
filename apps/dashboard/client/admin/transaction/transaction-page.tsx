"use client";

import { Typography } from "@heroui/react";
import { TanstackTable } from "./components/table-test";

export const TransactionsPage: React.FC = () => {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<Typography type="h2">Overview</Typography>
				<div className="flex flex-col gap-2">
					<span>test</span>
				</div>
			</div>
			<div>
				<Typography type="h3">Transaction</Typography>
				<div>
					<TanstackTable />
				</div>
			</div>
		</div>
	);
};
