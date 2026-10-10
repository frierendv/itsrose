import { z } from "zod/v4";

export const InvoiceDocumentTypeSchema = z.enum(["invoice", "quotation"]);
export type InvoiceDocumentType = z.infer<typeof InvoiceDocumentTypeSchema>;
