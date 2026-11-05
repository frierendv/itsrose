"use client";

import { AdminPage } from "../components/shell";
import { RateTable } from "../components/usage/rate-table";

export const AdminRatesPage: React.FC = () => (
	<AdminPage
		description="Versioned unit prices per plan tier. Publishing a version closes the previous row and is recorded in the audit trail; settled periods keep the version they were invoiced with."
		title="Usage rates"
	>
		<RateTable />
	</AdminPage>
);

AdminRatesPage.displayName = "AdminRatesPage";
