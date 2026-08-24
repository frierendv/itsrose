import { BillingFaq } from "@/components/faq/billing";
import { UserBillingSettings } from "@better-auth-ui/heroui/plugins/billing";
import { Fragment } from "react/jsx-runtime";

export const BillingSettingsPage = async () => (
	<Fragment>
		<UserBillingSettings />
		<BillingFaq />
	</Fragment>
);
