import { createHash } from "node:crypto";
import type { MidtransClient } from "@itsrose/midtrans";
import type { GenericEndpointContext } from "better-auth";
import { BILLING_PLANS } from "../server/constants";

export interface MockDbState {
	subscriptions: any[];
	transaction_invoices: any[];
	transaction_events: any[];
	invoice_sequence: any[];
	api_plans: any[];
	user: any[];
}

export function createMockDbAdapter(initialState?: Partial<MockDbState>) {
	const state: MockDbState = {
		subscriptions: [],
		transaction_invoices: [],
		transaction_events: [],
		invoice_sequence: [],
		api_plans: [...BILLING_PLANS],
		user: [
			{
				id: "user-123",
				name: "Alice Tester",
				email: "alice@itsrose.rest",
			},
		],
		...initialState,
	};

	const adapter: any = {
		state,
		findOne: async ({
			model,
			where,
		}: {
			model: string;
			where: Array<{ field: string; value: any }>;
		}) => {
			const list = (state as any)[model] ?? [];
			return (
				list.find((item: any) =>
					where.every((w) => item[w.field] === w.value)
				) ?? null
			);
		},
		findMany: async ({
			model,
			where,
		}: {
			model: string;
			where?: Array<{ field: string; value: any }>;
		}) => {
			const list = (state as any)[model] ?? [];
			if (!where || where.length === 0) {
				return [...list];
			}
			return list.filter((item: any) =>
				where.every((w) => item[w.field] === w.value)
			);
		},
		create: async ({ model, data }: { model: string; data: any }) => {
			const list = (state as any)[model] ?? [];
			const record = {
				id:
					data.id ??
					`id-${Math.random().toString(36).substring(2, 9)}`,
				...data,
			};
			list.push(record);
			(state as any)[model] = list;
			return record;
		},
		update: async ({
			model,
			where,
			update,
		}: {
			model: string;
			where: Array<{ field: string; value: any }>;
			update: any;
		}) => {
			const list = (state as any)[model] ?? [];
			const index = list.findIndex((item: any) =>
				where.every((w) => item[w.field] === w.value)
			);
			if (index !== -1) {
				list[index] = { ...list[index], ...update };
				return list[index];
			}
			return null;
		},
		delete: async ({
			model,
			where,
		}: {
			model: string;
			where: Array<{ field: string; value: any }>;
		}) => {
			const list = (state as any)[model] ?? [];
			const index = list.findIndex((item: any) =>
				where.every((w) => item[w.field] === w.value)
			);
			if (index !== -1) {
				const [deleted] = list.splice(index, 1);
				return deleted;
			}
			return null;
		},
		transaction: async (cb: any) => {
			return cb(adapter);
		},
	};

	return adapter;
}

export function createMockMidtransClient(
	serverKey = "test_server_key_123"
): MidtransClient {
	const invoiceStore = new Map<string, any>();

	const client: any = {
		invoiceStore,
		merchant: {
			generateOrderId: (userId: string) =>
				`ORD-202610-${userId.slice(0, 4)}-TEST`,
			verifySignature: (tx: any) => {
				if (!tx.signature_key) {
					return false;
				}
				const str = `${tx.order_id}${tx.status_code}${tx.gross_amount}${serverKey}`;
				const expected = createHash("sha512").update(str).digest("hex");
				return expected === tx.signature_key;
			},
			createSignature: (tx: any) => {
				const str = `${tx.order_id}${tx.status_code}${tx.gross_amount}${serverKey}`;
				return createHash("sha512").update(str).digest("hex");
			},
		},
		invoice: {
			create: async (payload: any) => {
				const id = `inv_${Math.random().toString(36).substring(2, 9)}`;
				const invoice = {
					id,
					status: "pending",
					order_id: payload.order_id,
					invoice_number: payload.invoice_number,
					invoice_date: payload.invoice_date,
					due_date: payload.due_date,
					gross_amount: payload.item_details?.[0]?.price ?? 0,
					payment_link_url: `https://app.midtrans.com/payment/${id}`,
					pdf_url: `https://app.midtrans.com/pdf/${id}`,
					...payload,
				};
				invoiceStore.set(id, invoice);
				return { data: invoice, error: null };
			},
			get: async (invoiceId: string) => {
				const found = invoiceStore.get(invoiceId);
				if (!found) {
					return {
						data: {
							id: invoiceId,
							status: "pending",
						},
						error: null,
					};
				}
				return { data: found, error: null };
			},
			void: async (invoiceId: string) => {
				const found = invoiceStore.get(invoiceId);
				if (found) {
					found.status = "void";
				}
				return { data: { success: true }, error: null };
			},
		},
	};

	return client as MidtransClient;
}

export function createMockEndpointContext(opts: {
	userId?: string;
	body?: any;
	query?: any;
	request?: any;
	adapter?: any;
}): GenericEndpointContext {
	const userId = opts.userId ?? "user-123";
	const adapter = opts.adapter ?? createMockDbAdapter();

	const ctx: any = {
		body: opts.body ?? {},
		query: opts.query ?? {},
		request: opts.request,
		context: {
			session: {
				user: {
					id: userId,
					name: "Alice Tester",
					email: "alice@itsrose.rest",
					role: "user",
				},
				session: {
					id: "sess-123",
					userId,
				},
			},
			adapter,
		},
		json: (data: any, init?: any) => ({
			data,
			status: init?.status ?? 200,
		}),
	};

	return ctx as GenericEndpointContext;
}
