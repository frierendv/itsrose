import { createAuthMetadata } from "@/shared/server";

export { ForgotPassword } from "@better-auth-ui/heroui";
export const generateMetadata = createAuthMetadata("auth", "forgotPassword");
