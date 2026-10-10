import { z } from "zod/v4";

export const EnabledPayments = z.enum([
	"credit_card",
	"cimb_clicks",
	"bca_klikbca",
	"bca_klikpay",
	"bri_epay",
	"echannel",
	"permata_va",
	"bca_va",
	"bni_va",
	"bri_va",
	"cimb_va",
	"other_va",
	"gopay",
	"indomaret",
	"danamon_online",
	"akulaku",
	"shopeepay",
	"kredivo",
	"uob_ezpay",
	"other_qris",
]);
