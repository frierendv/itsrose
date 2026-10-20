import { generateMetadata, InvoicesPage } from "@/client/billing/invoices";
import { Suspense } from "react";

export { generateMetadata };

export default function Page() {
	return (
		<Suspense fallback={null}>
			<InvoicesPage />
		</Suspense>
	);
}
