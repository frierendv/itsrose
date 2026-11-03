import { ResetPassword } from "@better-auth-ui/heroui";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Reset Password",
};

export default function ResetPasswordPage() {
	return <ResetPassword />;
}
