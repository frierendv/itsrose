import { AccountSettings } from "@better-auth-ui/heroui";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Account",
	description: "Manage your personal profile and account credentials.",
};

export default function AccountPage() {
	return <AccountSettings variant="default" />;
}
