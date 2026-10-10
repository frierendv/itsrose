import fs from "fs";
import path from "path";
import { InvoiceWebhookSchema } from "../schema";

const rootDir = path.join(
	"packages/midtrans/src/test/invoice-datas/webhook-payment_link"
);

const dirs = fs.readdirSync(rootDir, {
	recursive: true,
	withFileTypes: true,
});
for (const dir of dirs) {
	if (dir.isFile()) {
		const file = path.join(dir.parentPath, dir.name);
		const paymentType = dir.parentPath.replace(rootDir + "/", "");
		const status = dir.name.split(".")[0];
		const response = JSON.parse(fs.readFileSync(file, "utf-8"));
		console.debug({ payment_type: paymentType, status });
		console.debug(InvoiceWebhookSchema.parse(response));
	}
}

// console.log(InvoiceWebhookSchema.parse(bankPending));
// console.log(InvoiceWebhookSchema.parse(qrisPending));
// console.log(InvoiceWebhookSchema.parse(bankSettlement));
