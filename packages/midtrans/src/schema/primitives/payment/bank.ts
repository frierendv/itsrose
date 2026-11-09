import { z } from "zod/v4";

export const VaBankSchema = z.enum([
	"echannel", // Mandiri
	"bni_va",
	"bri_va",
	"bca_va",
	"cimb_va",
	"permata_va",
	"other_va",

	// not supported in some API
	"bsi_va",
	"danamon_va",
	"mega_va", // unknown
	"seabank_va",
	"saqu_va",
]);

export type VaBank = z.infer<typeof VaBankSchema>;

export const BankCodeSchema = z.enum([
	"bni",
	"bri",
	"bca",
	"cimb",
	"mandiri",
	"maybank",
	"permata",

	// not supported in some API
	"bsi",
	"danamon",
	"mega",
	"seabank",
	"saqu",
]);

export type BankCode = z.infer<typeof BankCodeSchema>;
