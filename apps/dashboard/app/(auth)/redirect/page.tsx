import { AuthRedirect } from "@better-auth-ui/heroui";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Redirecting...",
};

export default function AuthRedirectPage() {
	return <AuthRedirect />;
}
