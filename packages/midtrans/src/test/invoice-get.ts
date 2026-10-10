import { InvoiceResponseSchema } from "../schema";
import { client } from "./test-client";

const invoices = [
	"6ac262579e62055b53c43648",
	"6ac272479e62055b53c43679",
	"6ac26d9e9e62055b53c43676",
];

for await (const invoice of invoices) {
	const { data, error } = await client.invoice.get(invoice);

	if (error) {
		console.error(error);
		continue;
	}
	console.log(InvoiceResponseSchema.parse(data));
}
