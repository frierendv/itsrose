import { SecuritySettings } from "@better-auth-ui/heroui";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Security",
	description:
		"Manage two-factor authentication, sessions, and security keys.",
};

export default function SecurityPage() {
	return <SecuritySettings variant="default" />;
}
