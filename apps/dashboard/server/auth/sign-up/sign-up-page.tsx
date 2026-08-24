import { createAuthMetadata } from "@/shared/server";

export { SignUp } from "@better-auth-ui/heroui";
export const generateMetadata = createAuthMetadata("auth", "signUp");
