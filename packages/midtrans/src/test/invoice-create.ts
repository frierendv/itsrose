import { exit } from "node:process";
import { client, randomOrderId, today, tomorrow, userId } from "./test-client";

const { data, error } = await client.invoice.create(
	{
		invoice_date: today,
		due_date: tomorrow,
		invoice_number: "1",
		order_id: randomOrderId(),
		customer_details: {
			id: userId,
			name: "David Stefen Alvianus",
			email: "davidstefen56@gmail.com",
			phone: "82313123123",
			notes: "Customer notes",
			customer_details_required_fields: ["name", "phone", "email"],
		},
		notes: "Invoice due for 14 Days",
		item_details: [
			{
				item_id: "premium-access",
				description: "Premium access",
				price: 10_000,
				quantity: 1,
			},
		],
		payment_type: "payment_link",
	},
	{
		overrideNotification: "https://api-staged.itsrose.net/hooks/invoice",
	}
);

if (error) {
	console.error(error);
	exit(1);
}
console.log(data);
