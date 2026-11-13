import {
	createTransactionSignature,
	verifyNotificationSignature,
	type MidtransClient,
} from "@itsrose/midtrans";
import type { GenericEndpointContext } from "better-auth";
import {
	createBillingRepositories,
	createBillingUnitOfWork,
	createMidtransPaymentGateway,
} from "../src/adapter";
import { BILLING_PLANS } from "../src/domain/constants";
import { systemClock, type BillingDependencies } from "../src/domain/ports";

/**
 * A single row of the in-memory database behind the test doubles.
 *
 * The mock adapter never validates rows (it is a dumb store), so the rows are
 * kept untyped. Tests read them back through the domain type they expect,
 * e.g. `adapter.findOne<Subscription>(...)`.
 */
export type MockRow = Record<string, unknown>;

/**
 * A `where` clause understood by the mock database adapter.
 */
export type MockWhere = { field: string; value: unknown };

export interface MockDbState {
	subscriptions: MockRow[];
	transaction_invoices: MockRow[];
	transaction_events: MockRow[];
	invoice_sequence: MockRow[];
	api_plans: MockRow[];
	user: MockRow[];
	/** Tables created on demand for models the billing package does not seed. */
	[key: string]: MockRow[];
}

export type MockFindParams = {
	model: string;
	where: MockWhere[];
};

export type MockFindManyParams = {
	model: string;
	where?: MockWhere[];
};

export type MockCreateParams<T extends MockRow = MockRow> = {
	model: string;
	data: T;
};

export type MockUpdateParams = {
	model: string;
	where: MockWhere[];
	update: MockRow;
};

export type MockDeleteParams = {
	model: string;
	where: MockWhere[];
};

/**
 * The database double used by the billing tests. It mirrors the subset of the
 * Better Auth adapter the billing repositories rely on.
 */
export type MockDbAdapter = {
	state: MockDbState;
	findOne<T extends MockRow = MockRow>(
		params: MockFindParams
	): Promise<T | null>;
	findMany<T extends MockRow = MockRow>(
		params: MockFindManyParams
	): Promise<T[]>;
	create<T extends MockRow = MockRow>(
		params: MockCreateParams<T>
	): Promise<T>;
	update<T extends MockRow = MockRow>(
		params: MockUpdateParams
	): Promise<T | null>;
	delete<T extends MockRow = MockRow>(
		params: MockDeleteParams
	): Promise<T | null>;
	transaction<T>(work: (adapter: MockDbAdapter) => Promise<T>): Promise<T>;
};

/**
 * A Midtrans invoice as it is kept by the mock client.
 */
export type MockInvoice = Record<string, unknown>;

/**
 * The Midtrans client double. It carries the real client surface plus the
 * invoice store the tests use to simulate a settled invoice.
 */
export type MockMidtransClient = MidtransClient & {
	invoiceStore: Map<string, MockInvoice>;
};

/**
 * Options accepted by {@link createMockEndpointContext}.
 */
export type MockEndpointContextOptions = {
	userId?: string;
	body?: Record<string, unknown>;
	query?: Record<string, unknown>;
	request?: { json: () => Promise<unknown> };
	adapter?: MockDbAdapter;
};

/**
 * The endpoint context handed to the billing endpoints.
 *
 * Better Auth types `request` as optional on the generic context, while
 * endpoints declared with `requireRequest` expect it to be present; the mock
 * always provides one and narrows the type accordingly.
 */
export type MockEndpointContext = GenericEndpointContext & {
	request: Request;
};

function matchesWhere(row: MockRow, where: MockWhere[]): boolean {
	return where.every((condition) => row[condition.field] === condition.value);
}

/**
 * Returns the table backing a model, creating it on first access.
 */
function tableFor(state: MockDbState, model: string): MockRow[] {
	const existing = state[model];
	if (!existing) {
		const created: MockRow[] = [];
		state[model] = created;
		return created;
	}
	return existing;
}

/**
 * Reads the price of the first invoice item, mirroring the Midtrans payload
 * shape used by the billing invoice payloads.
 */
function readFirstItemPrice(itemDetails: unknown): number {
	if (!Array.isArray(itemDetails)) {
		return 0;
	}

	const [first] = itemDetails;
	if (typeof first !== "object" || first === null) {
		return 0;
	}

	const price = (first as Record<string, unknown>).price;
	return typeof price === "number" ? price : 0;
}

export function createMockDbAdapter(
	initialState?: Partial<MockDbState>
): MockDbAdapter {
	const state: MockDbState = {
		subscriptions: initialState?.subscriptions ?? [],
		transaction_invoices: initialState?.transaction_invoices ?? [],
		transaction_events: initialState?.transaction_events ?? [],
		invoice_sequence: initialState?.invoice_sequence ?? [],
		api_plans:
			initialState?.api_plans ??
			BILLING_PLANS.map((plan) => ({ ...plan })),
		user: initialState?.user ?? [
			{
				id: "user-123",
				name: "Alice Tester",
				email: "alice@itsrose.rest",
			},
		],
	};

	const adapter: MockDbAdapter = {
		state,

		async findOne<T extends MockRow = MockRow>({
			model,
			where,
		}: MockFindParams) {
			const row = tableFor(state, model).find((item) =>
				matchesWhere(item, where)
			);
			return (row ?? null) as T | null;
		},

		async findMany<T extends MockRow = MockRow>({
			model,
			where,
		}: MockFindManyParams) {
			const rows = tableFor(state, model);
			if (!where || where.length === 0) {
				return [...rows] as T[];
			}
			return rows.filter((item) => matchesWhere(item, where)) as T[];
		},

		async create<T extends MockRow = MockRow>({
			model,
			data,
		}: MockCreateParams<T>) {
			const rows = tableFor(state, model);
			const record: MockRow = {
				id:
					typeof data.id === "string"
						? data.id
						: `id-${Math.random().toString(36).substring(2, 9)}`,
				...data,
			};
			rows.push(record);
			return record as T;
		},

		async update<T extends MockRow = MockRow>({
			model,
			where,
			update,
		}: MockUpdateParams) {
			const rows = tableFor(state, model);
			const index = rows.findIndex((item) => matchesWhere(item, where));
			if (index === -1) {
				return null;
			}
			const merged: MockRow = { ...(rows[index] ?? {}), ...update };
			rows[index] = merged;
			return merged as T;
		},

		async delete<T extends MockRow = MockRow>({
			model,
			where,
		}: MockDeleteParams) {
			const rows = tableFor(state, model);
			const index = rows.findIndex((item) => matchesWhere(item, where));
			if (index === -1) {
				return null;
			}
			const [deleted] = rows.splice(index, 1);
			return (deleted ?? null) as T | null;
		},

		async transaction<T>(work: (adapter: MockDbAdapter) => Promise<T>) {
			return work(adapter);
		},
	};

	return adapter;
}

export function createMockMidtransClient(
	serverKey = "test_server_key_123"
): MockMidtransClient {
	const invoiceStore = new Map<string, MockInvoice>();

	const client = {
		invoiceStore,
		merchant: {
			generateOrderId: (userId: string) =>
				`ORD-202610-${userId.slice(0, 4)}-TEST`,
			verifySignature: (payload: unknown) =>
				verifyNotificationSignature(serverKey, payload),
			createSignature: (transaction: {
				order_id: string;
				status_code: string | number;
				gross_amount: string;
			}) => createTransactionSignature(serverKey, transaction),
		},
		invoice: {
			create: async (payload: MockInvoice) => {
				const id = `inv_${Math.random().toString(36).substring(2, 9)}`;
				const invoice: MockInvoice = {
					id,
					status: "pending",
					order_id: payload.order_id,
					invoice_number: payload.invoice_number,
					invoice_date: payload.invoice_date,
					due_date: payload.due_date,
					gross_amount: readFirstItemPrice(payload.item_details),
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

	// Invariant: the billing gateway only reaches for `merchant.generateOrderId`,
	// `merchant.verifySignature` and the `invoice` API, and the mock implements
	// exactly those with the real Midtrans SHA-512 signature rules.
	return client as unknown as MockMidtransClient;
}

export function createMockEndpointContext(
	opts: MockEndpointContextOptions
): MockEndpointContext {
	const userId = opts.userId ?? "user-123";
	const adapter = opts.adapter ?? createMockDbAdapter();
	const request = opts.request ?? { json: async () => ({}) };

	const ctx = {
		body: opts.body ?? {},
		query: opts.query ?? {},
		request,
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
		json: (data: unknown, init?: { status?: number }) => ({
			data,
			status: init?.status ?? 200,
		}),
	};

	// Invariant: Better Auth builds a `GenericEndpointContext` from a live
	// request; the mock exposes the surface the billing plugin reads
	// (session user + database adapter) and nothing more.
	return ctx as unknown as MockEndpointContext;
}

/**
 * Narrows a nullable row to a defined one.
 *
 * Fails the test when the lookup did not match, mirroring the behaviour of
 * reading a property straight off a missing row.
 */
export function expectRow<T>(row: T | null | undefined): T {
	if (row === null || row === undefined) {
		throw new Error(
			"Expected a matching row, but the lookup returned none."
		);
	}
	return row;
}

/**
 * Builds the application dependency graph for tests, using the real
 * Better Auth adapter (mock DB) + Midtrans gateway adapter.
 */
export function createTestDependencies(
	ctx: GenericEndpointContext,
	client: MidtransClient
): BillingDependencies {
	const repositories = createBillingRepositories(ctx);

	return {
		repositories,
		gateway: createMidtransPaymentGateway(client),
		clock: systemClock,
		unitOfWork: createBillingUnitOfWork(ctx, repositories),
	};
}
