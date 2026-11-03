import { ResetLinkSent } from "@better-auth-ui/heroui";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Reset Link Sent",
};

export default function ResetLinkSentPage() {
	return <ResetLinkSent />;
}
