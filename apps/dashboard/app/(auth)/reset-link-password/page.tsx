import { createAuthMetadata } from "@/lib/auth";
import { ResetPassword } from "@better-auth-ui/heroui";

export const generateMetadata = createAuthMetadata("auth", "resetPassword");

export default function ResetPasswordPage() {
	return <ResetPassword />;
}
