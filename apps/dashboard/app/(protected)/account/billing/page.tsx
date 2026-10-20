import { BillingPage, generateMetadata } from "@/client/billing";
import { Suspense } from "react";

export { generateMetadata };

export default function Page() {
	return (
		<Suspense fallback={null}>
			<BillingPage />
		</Suspense>
	);
}
