"use client";

import { BillingFaq } from "@/components/faq/billing";
import { UserBillingSettings } from "@better-auth-ui/heroui/plugins/billing";
import { Separator } from "@heroui/react/separator";
import { Fragment } from "react/jsx-runtime";

export const BillingPage: React.FC = () => {
	return (
		<Fragment>
			<UserBillingSettings />
			<Separator />
			<BillingFaq />
		</Fragment>
	);
};

BillingPage.displayName = "BillingPage";
