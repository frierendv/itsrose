import type {
	DBAdapter,
	GenericEndpointContext,
	SecondaryStorage,
} from "better-auth";
import type {
	ApiPlan,
	Subscription,
	TransactionInvoice,
	TransactionInvoiceEvent,
} from "../types";

export type DatabaseAdapter =
	GenericEndpointContext["context"]["adapter"] | DBAdapter<any>;

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
 * Persistence port for invoices and invoice events.
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

export interface InvoiceEventRepository {
	record(
		eventName: string,
		eventJson: Record<string, unknown>
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
}

export interface BillingRepositories {
	plans: PlanRepository;
	subscriptions: SubscriptionRepository;
	invoices: InvoiceRepository;
	events: InvoiceEventRepository;
	sequences: InvoiceSequenceRepository;
	users: UserRepository;
}

export type BillingStorage = SecondaryStorage;
