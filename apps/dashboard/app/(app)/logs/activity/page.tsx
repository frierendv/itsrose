import { UserActivity } from "@better-auth-ui/heroui/plugins/dash";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Activity",
	description: "View account audit and authentication activity logs.",
};

export default function LogsActivityPage() {
	return <UserActivity variant="default" />;
}
