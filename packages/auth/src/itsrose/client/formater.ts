/**
 * Currency formatter for Indonesian Rupiah (IDR).
 * Example: Rp 160.000
 */
const idrFormatter = new Intl.NumberFormat("id-ID", {
	style: "currency",
	currency: "IDR",
	minimumFractionDigits: 0,
	maximumFractionDigits: 0,
});

export function formatIDR(amount: number): string {
	return idrFormatter.format(amount || 0);
}

/**
 * Standard Indonesian date formatter.
 * Example: 18 Okt 2026
 */
const dateIDFormatter = new Intl.DateTimeFormat("id-ID", {
	day: "numeric",
	month: "short",
	year: "numeric",
});

export function formatDateID(
	dateInput: string | Date | number | null | undefined
): string {
	if (!dateInput) {
		return "—";
	}
	const date = new Date(dateInput);
	if (Number.isNaN(date.getTime())) {
		return "—";
	}
	return dateIDFormatter.format(date);
}

/**
 * Date and time formatter for Indonesian locale.
 * Example: 18 Okt 2026, 14.30
 */
const dateTimeIDFormatter = new Intl.DateTimeFormat("id-ID", {
	day: "numeric",
	month: "short",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});

export function formatDateTimeID(
	dateInput: string | Date | number | null | undefined
): string {
	if (!dateInput) {
		return "—";
	}
	const date = new Date(dateInput);
	if (Number.isNaN(date.getTime())) {
		return "—";
	}
	return dateTimeIDFormatter.format(date);
}
