/**
 * Settles a pending sandbox transaction through the payment simulator.
 *
 * ```bash
 * pnpm --filter @itsrose/midtrans sandbox:pay <order-id>
 * ```
 */
import {
	existsSync as __existsSync,
	readFileSync as __readFileSync,
} from "node:fs";
import { dirname as __dirnameFn, join as __joinFn } from "node:path";
import { fileURLToPath as __fileURLToPathFn } from "node:url";
import { MidtransClient } from "../src/client/client";
import {
	payCstore,
	payVirtualAccount,
	type SimulatorResult,
	type SimulatorVaBank,
} from "./sandbox-simulator";

const __envFile = __joinFn(
	__dirnameFn(__fileURLToPathFn(import.meta.url)),
	"..",
	".env.dev"
);
if (__existsSync(__envFile)) {
	for (const line of __readFileSync(__envFile, "utf8").split("\n")) {
		const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
		if (match?.[1] && process.env[match[1]] === undefined) {
			process.env[match[1]] = match[2];
		}
	}
}

const OPENAPI_BANKS: ReadonlySet<SimulatorVaBank> = new Set([
	"bri",
	"permata",
	"cimb",
	"danamon",
	"bsi",
	"seabank",
	"saqu",
]);

async function main(): Promise<void> {
	const orderId = process.argv[2];
	if (!orderId) {
		throw new Error("Usage: sandbox:pay <order-id>");
	}

	const client = new MidtransClient();
	let status = await client.core.payment.status(orderId);

	if (status.data.transaction_status === "settlement") {
		console.log(`${orderId} is already settled`);
		return;
	}

	const data = status.data;
	let payment: SimulatorResult;

	if (data.payment_type === "bank_transfer") {
		const vaNumber =
			data.va_numbers?.[0]?.va_number ?? data.permata_va_number;
		const bank = data.va_numbers?.[0]?.bank ?? "permata";

		if (!vaNumber) {
			throw new Error(`${orderId} has no virtual account number`);
		}

		const simulatorBank = (
			OPENAPI_BANKS.has(bank as SimulatorVaBank) ||
			bank === "bca" ||
			bank === "bni"
				? bank
				: "permata"
		) as SimulatorVaBank;

		payment = await payVirtualAccount({
			bank: simulatorBank,
			vaNumber,
			amount: data.gross_amount,
		});
	} else if (data.payment_type === "cstore") {
		if (!data.store || !data.payment_code) {
			throw new Error(`${orderId} has no payment code`);
		}
		payment = await payCstore({
			store: data.store,
			paymentCode: data.payment_code,
			productCode: process.env.MIDTRANS_INDOMARET_PRODUCT_CODE,
		});
	} else {
		throw new Error(
			`${orderId}: ${data.payment_type} is not supported by the simulator helper`
		);
	}

	console.log("simulator:", payment.ok ? "successful" : "failed");

	for (let attempt = 0; attempt < 10; attempt++) {
		status = await client.core.payment.status(orderId);
		if (status.data.transaction_status === "settlement") {
			console.log(`${orderId} settled at ${status.data.settlement_time}`);
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	console.error(`${orderId} is still ${status.data.transaction_status}`);
	process.exitCode = 1;
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
