import type {
	ApiPlan,
	Subscription,
	Tenant,
	TenantKind,
	TransactionInvoice,
	TransactionInvoiceEvent,
} from "../types";
import type { GatewayInvoice } from "./invoice.service";

/* -------------------------------------------------------------------------- */
/*                            Persistence ports                               */
/* -------------------------------------------------------------------------- */

export interface InvoiceFilter {
	userId?: string;
	status?: string;
	invoiceType?: string;
	limit?: number;
	offset?: number;
}

export interface InvoiceEventFilter {
	eventName?: string;
	limit?: number;
	offset?: number;
}

export interface UserContact {
	id: string;
	name?: string | null;
	email?: string | null;
}

/**
 * Persistence port for the plan catalog, including read-through cache and the
 * built-in fallback catalog.
 */
export interface PlanRepository {
	findAll(customDefaults?: readonly ApiPlan<true>[]): Promise<ApiPlan[]>;
	findById(planId: string): Promise<ApiPlan | null>;
	/** Database-only lookup; write paths must not be masked by memory fallbacks. */
	findStoredById(planId: string): Promise<ApiPlan | null>;
	seed(plans?: readonly (ApiPlan<true> | ApiPlan)[]): Promise<void>;
	create(data: Record<string, unknown>): Promise<ApiPlan>;
	update(
		planId: string,
		data: Record<string, unknown>
	): Promise<ApiPlan | null>;
	delete(planId: string): Promise<boolean>;
	invalidateCache(planId?: string): Promise<void>;
}

/**
 * Persistence port for subscription records and their per-user cache.
 */
export interface SubscriptionRepository {
	findById(id: string): Promise<Subscription | null>;
	findCurrentByUser(userId: string): Promise<Subscription | null>;
	findManyByUser(userId: string): Promise<Subscription[]>;
	findAll(): Promise<Subscription[]>;
	findManyByStatus(status: string): Promise<Subscription[]>;
	create(data: Record<string, unknown>): Promise<Subscription>;
	update(
		id: string,
		data: Partial<Subscription>
	): Promise<Subscription | null>;
	invalidateCache(userId: string): Promise<void>;
}

/**
 * Persistence port for invoices.
 */
export interface InvoiceRepository {
	findById(invoiceId: string): Promise<TransactionInvoice | null>;
	findByOrderId(orderId: string): Promise<TransactionInvoice | null>;
	findMany(filter?: InvoiceFilter): Promise<TransactionInvoice[]>;
	findPendingRenewal(userId: string): Promise<TransactionInvoice[]>;
	findPendingByUser(userId: string): Promise<TransactionInvoice[]>;
	create(data: TransactionInvoice): Promise<TransactionInvoice>;
	update(
		invoiceId: string,
		data: Partial<TransactionInvoice>
	): Promise<TransactionInvoice | null>;
}

/**
 * Append-only audit event port for webhook/invoice lifecycle events.
 */
export interface WebhookEventStore {
	record(
		eventName: string,
		eventJson: Record<string, unknown>,
		createdAt?: Date
	): Promise<void>;
	findMany(filter?: InvoiceEventFilter): Promise<TransactionInvoiceEvent[]>;
}

export interface InvoiceSequenceRepository {
	/** Atomically allocates the next invoice number for the current year. */
	next(prefix?: string): Promise<string>;
}

export interface UserRepository {
	/** Reads the minimal user profile needed for Midtrans customer details. */
	findContact(userId: string): Promise<UserContact | null>;
	/** Ids of every user, used by the tenant backfill. */
	findAllIds(limit?: number): Promise<string[]>;
}

/* -------------------------------------------------------------------------- */
/*                                 Tenancy                                    */
/* -------------------------------------------------------------------------- */

export interface TenantRepository {
	findById(tenantId: string): Promise<Tenant | null>;
	findPersonalByUser(userId: string): Promise<Tenant | null>;
	/** Idempotent create by id, used by the personal-tenant bootstrap. */
	ensure(data: {
		id: string;
		kind: TenantKind;
		name: string;
		owner_user_id: string;
	}): Promise<{ tenant: Tenant; created: boolean }>;
	ensureMember(input: {
		tenant_id: string;
		user_id: string;
		role: string;
	}): Promise<void>;
}

/**
 * Aggregate of all persistence ports required by the billing application.
 */
export interface BillingRepositories {
	plans: PlanRepository;
	subscriptions: SubscriptionRepository;
	invoices: InvoiceRepository;
	events: WebhookEventStore;
	sequences: InvoiceSequenceRepository;
	users: UserRepository;
	tenants: TenantRepository;
}

/* -------------------------------------------------------------------------- */
/*                         External service ports                             */
/* -------------------------------------------------------------------------- */

export interface InvoiceCustomerPayload {
	id: string;
	name: string;
	email?: string;
}

export interface InvoiceItemPayload {
	item_id: string;
	description: string;
	price: number;
	quantity: number;
}

/**
 * Gateway-agnostic invoice creation payload. Concrete adapters map this onto
 * their provider SDK (Midtrans today).
 */
export interface InvoiceCreatePayload {
	order_id: string;
	invoice_number: string;
	payment_type: "payment_link";
	invoice_date: string;
	due_date: string;
	customer_details: InvoiceCustomerPayload;
	notes: string;
	item_details: InvoiceItemPayload[];
}

export type PaymentGatewayResult<T> =
	{ ok: true; data: T } | { ok: false; message: string };

export type PaymentGatewayVoidResult =
	{ ok: true } | { ok: false; message: string };

/**
 * Payment provider port. Application code never imports a provider SDK.
 */
export interface WebhookNotificationContext {
	/** Provider invoice id resolved from signed metadata, when present. */
	invoiceId?: string;
	/** Provider order id used as a fallback lookup key. */
	orderId?: string;
}

export interface PaymentGatewayPort {
	generateOrderId(userId: string): string;
	/** Extracts provider-specific notification identifiers without trusting them. */
	parseNotification(
		payload: Record<string, unknown>
	): WebhookNotificationContext;
	createInvoice(
		payload: InvoiceCreatePayload,
		options: { idempotencyKey: string }
	): Promise<PaymentGatewayResult<GatewayInvoice>>;
	getInvoice(invoiceId: string): Promise<GatewayInvoice | null>;
	voidInvoice(invoiceId: string): Promise<PaymentGatewayVoidResult>;
	verifySignature(payload: Record<string, unknown>): boolean;
}

/**
 * Injectable time source, used by application services and tests.
 */
export interface ClockPort {
	now(): Date;
}

export const systemClock: ClockPort = {
	now: () => new Date(),
};

/* -------------------------------------------------------------------------- */
/*                         Unit of work / composition                         */
/* -------------------------------------------------------------------------- */

/**
 * Transaction port. Work runs against the transaction-scoped repository set;
 * implementations fall back to the base repositories when the driver has no
 * transaction support.
 */
export interface BillingUnitOfWork {
	readonly repositories: BillingRepositories;
	run<T>(work: (repositories: BillingRepositories) => Promise<T>): Promise<T>;
}

export interface BillingDependencies {
	repositories: BillingRepositories;
	gateway: PaymentGatewayPort;
	clock: ClockPort;
	unitOfWork: BillingUnitOfWork;
}

/* -------------------------------------------------------------------------- */
/*                         Application service options                        */
/* -------------------------------------------------------------------------- */

/**
 * Context-free lifecycle hooks consumed by the application layer. The plugin
 * binding adds the Better Auth endpoint context when invoking them.
 */
export interface BillingLifecycleHooks {
	onInvoiceCreated?: (invoice: TransactionInvoice) => Promise<void> | void;
	onInvoicePaid?: (invoice: TransactionInvoice) => Promise<void> | void;
	onInvoiceVoided?: (invoice: TransactionInvoice) => Promise<void> | void;
	onSubscriptionCreated?: (
		subscription: Subscription
	) => Promise<void> | void;
	onSubscriptionUpdated?: (
		subscription: Subscription
	) => Promise<void> | void;
	onSubscriptionCanceled?: (
		subscription: Subscription
	) => Promise<void> | void;
}

export interface BillingServiceOptions {
	defaultDueDays?: number;
	autoSeedPlans?: boolean;
	defaultPlans?: ApiPlan<true>[];
	hooks?: BillingLifecycleHooks;
}
