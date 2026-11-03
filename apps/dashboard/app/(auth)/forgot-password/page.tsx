import { createAuthMetadata } from "@/lib/auth";
import { ForgotPassword } from "@better-auth-ui/heroui";

export const generateMetadata = createAuthMetadata("auth", "forgotPassword");

export default function ForgotPasswordPage() {
	return <ForgotPassword />;
}
