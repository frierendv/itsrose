import { exit } from "node:process";
import { InvoiceResponseSchema } from "../schema";
import { client } from "./test-client";

const { data, error } = await client.invoice.get("6ac262579e62055b53c43648", {
	overrideNotification: "https://api-staged.itsrose.net/hooks/invoice",
});
if (error) {
	console.debug(error);
	exit(1);
}
console.debug(InvoiceResponseSchema.parse(data));
