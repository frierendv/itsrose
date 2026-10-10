/**
 * Bare transaction object for signature generation.
 */
export interface PartialSignatureTransaction {
	order_id: string;
	status_code: string | number;
	gross_amount: string | number;
	signature_key?: string;
}
