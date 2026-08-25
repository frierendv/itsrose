import { createAuthMetadata } from "@/shared/server";

export { ResetPassword } from "@better-auth-ui/heroui";
export const generateMetadata = createAuthMetadata("auth", "resetPassword");
