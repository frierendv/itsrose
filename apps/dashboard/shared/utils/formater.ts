import { format } from "date-fns";

export function formatCurrency(amount = 0, currency = "IDR"): string {
	if (currency === "IDR") {
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			maximumFractionDigits: 0,
		}).format(amount);
	}

	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(amount / 100);
}

export function formatDate(
	date?: string | Date | null,
	formatPattern = "MMM d, yyyy"
): string {
	if (!date) {
		return "-";
	}
	try {
		const parsed = typeof date === "string" ? new Date(date) : date;
		if (Number.isNaN(parsed.getTime())) {
			return "-";
		}
		return format(parsed, formatPattern);
	} catch {
		return "-";
	}
}
