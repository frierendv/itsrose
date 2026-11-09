import { z } from "zod/v4";

/* ------------------------- Reusable payment channel ------------------------- */
/** Card */
export const PaymentChannelCreditCard = z.literal("credit_card");
/** Bank VA / virtual account */
export const PaymentChannelBank = z.enum([
	"echannel",
	"permata_va",
	"bca_va",
	"bni_va",
	"bri_va",
	"cimb_va",
	"danamon_va",
	"bsi_va",
	"seabank_va",
	"saqu_va",
	"other_va",
]);
/** E-wallets */
export const PaymentChannelEwallet = z.enum([
	"gopay",
	"ovo",
	"dana",
	"shopeepay",
]);
/** Other Qris */
export const PaymentChannelOtherQris = z.literal("other_qris");
/** Over The Counter */
export const PaymentChannelOverTheCounter = z.enum(["alfamart", "indomaret"]);
/** Cardless Credit/BNPL */
export const PaymentChannelCardless = z.enum(["akulaku", "kredivo"]);

/** All available payment channels */
export const PaymentChannels = z.union([
	PaymentChannelBank,
	PaymentChannelEwallet,
	PaymentChannelOverTheCounter,
	PaymentChannelCardless,
	PaymentChannelOtherQris,
	PaymentChannelCreditCard,
]);

/* ------ types ------ */
export type PaymentChannelCreditCard = z.infer<typeof PaymentChannelCreditCard>;
export type PaymentChannelBank = z.infer<typeof PaymentChannelBank>;
export type PaymentChannelEwallet = z.infer<typeof PaymentChannelEwallet>;
export type PaymentChannelOtherQris = z.infer<typeof PaymentChannelOtherQris>;
export type PaymentChannelOverTheCounter = z.infer<
	typeof PaymentChannelOverTheCounter
>;
export type PaymentChannelCardless = z.infer<typeof PaymentChannelCardless>;
export type PaymentChannels = z.infer<typeof PaymentChannels> | (string & {});

/* ------------------------- Mostly used by payment link ------------------------- */
export const PaymentLinkSupportedBank = PaymentChannelBank.extract([
	"bni_va",
	"permata_va",
	"bca_va",
	"bri_va",
	"cimb_va",
]);
export type PaymentLinkSupportedBank = z.infer<typeof PaymentLinkSupportedBank>;
