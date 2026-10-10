import { z } from "zod/v4";
import {
	BankTransferFieldsSchema,
	MandiriEchannelFieldsSchema,
} from "./bank-transfer";
import { CreditCardFieldsSchema } from "./credit-card";
import {
	GopayFieldsSchema,
	OvoFieldsSchema,
	QrisFieldsSchema,
	ShopeepayFieldsSchema,
} from "./ewallet";
import { OverTheCounterSchema } from "./over-the-counter";

export const PaymentTypeSchema = z.enum([
	"bank_transfer",
	"echannel",
	"credit_card",
	"cstore",
	"gopay",
	"ovo",
	"shopeepay",
	"qris",
]);
export type PaymentType = z.infer<typeof PaymentTypeSchema>;

export const PaymentTypeFieldsSchema = z.discriminatedUnion("payment_type", [
	// bank or mandiri echannel
	z.object({
		payment_type: PaymentTypeSchema.extract(["bank_transfer"]),
		bank_transfer: BankTransferFieldsSchema,
	}),
	z.object({
		payment_type: PaymentTypeSchema.extract(["echannel"]),
		echannel: MandiriEchannelFieldsSchema,
	}),
	// credit card
	z.object({
		payment_type: PaymentTypeSchema.extract(["credit_card"]),
		credit_card: CreditCardFieldsSchema,
	}),
	// over the counter
	z.object({
		payment_type: PaymentTypeSchema.extract(["cstore"]),
		cstore: OverTheCounterSchema,
	}),
	// ewallets
	z.object({
		payment_type: PaymentTypeSchema.extract(["gopay"]),
		gopay: GopayFieldsSchema,
	}),
	z.object({
		payment_type: PaymentTypeSchema.extract(["ovo"]),
		ovo: OvoFieldsSchema,
	}),
	z.object({
		payment_type: PaymentTypeSchema.extract(["qris"]),
		qris: QrisFieldsSchema,
	}),
	z.object({
		payment_type: PaymentTypeSchema.extract(["shopeepay"]),
		shopeepay: ShopeepayFieldsSchema,
	}),
]);

export type PaymentTypeFields = z.infer<typeof PaymentTypeFieldsSchema>;
