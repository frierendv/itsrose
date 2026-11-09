import { z } from "zod/v4";

export const CstoreStoreSchema = z.enum(["alfamart", "indomaret"]);

export type CstoreStore = z.infer<typeof CstoreStoreSchema>;
