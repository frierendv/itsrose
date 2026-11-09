/**
 * Compile-only assertions for the narrowed Core charge response.
 *
 * This file is typechecked by `tsc`, not executed by Jest.
 */
import type { MidtransClient } from "../../src/client/client";
import type {
	CoreChargeResponse,
	CoreStatusB2BResponse,
} from "../../src/schema";

type ChargeData = NonNullable<
	Awaited<ReturnType<MidtransClient["core"]["payment"]["charge"]>>["data"]
>;

export function assertChargeNarrowing(response: CoreChargeResponse): void {
	if (response.payment_type === "qris") {
		const qrString: string = response.qr_string;
		void qrString;
	}

	if (response.payment_type === "echannel") {
		const billKey: string = response.bill_key;
		void billKey;
	}

	if (response.payment_type === "cstore") {
		const paymentCode: string = response.payment_code;
		void paymentCode;
	}

	if (response.payment_type === "bank_transfer") {
		const vaNumber = response.va_numbers?.[0]?.va_number;
		void vaNumber;
	}
}

export function assertClientChargeNarrowing(data: ChargeData): void {
	if (data.payment_type === "qris") {
		const qrString: string = data.qr_string;
		void qrString;
	}
}

export function assertStatusB2BShape(response: CoreStatusB2BResponse): void {
	const firstTransaction = response.transactions[0];
	void firstTransaction;
}
