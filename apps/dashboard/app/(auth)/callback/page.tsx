import { Auth } from "@better-auth-ui/heroui";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Authenticating...",
};

export default function AuthCallbackPage() {
	return <Auth view="callback" />;
}
