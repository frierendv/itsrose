import { z } from "zod/v4";

export const ChatCommandSchema = z.enum([
	"create_chat",
	"create_and_generate_turn",
]);
export type ChatCommand = z.infer<typeof ChatCommandSchema>;
