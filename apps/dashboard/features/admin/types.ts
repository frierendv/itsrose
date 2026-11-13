import type {
	billingCronSchema,
	createPlanSchema,
	listEventsSchema,
	listInvoiceSchema,
	listSubscriptionSchema,
	planPriceInputSchema,
	updatePlanSchema,
	updateSubscriptionSchema,
	voidInvoiceSchema,
} from "@itsrose/auth-billing/schema";

/**
 * Reads the inferred input/output types of a Zod v4 schema.
 *
 * The dashboard does not depend on `zod` directly, so `z.input` / `z.infer`
 * are not in scope here. Both are defined in terms of the `_zod` contract that
 * every Zod v4 schema exposes, so reading them off the schema value is
 * equivalent.
 *
 * - `SchemaInput` mirrors `z.input`: the shape a caller may send, before the
 *   server applies its defaults and coercions.
 * - `SchemaOutput` mirrors `z.infer`: the shape after the server's defaults
 *   and coercions have been applied.
 */
type SchemaInput<T extends { _zod: { input: unknown } }> = T["_zod"]["input"];
type SchemaOutput<T extends { _zod: { output: unknown } }> =
	T["_zod"]["output"];

/* -------------------------------------------------------------------------- */
/*                          Wire payloads (server owned)                      */
/* -------------------------------------------------------------------------- */

/** Body accepted by `plan.create`. */
export type CreatePlanPayload = SchemaInput<typeof createPlanSchema>;

/** Body accepted by `plan.update`. */
export type UpdatePlanPayload = SchemaInput<typeof updatePlanSchema>;

/** Body accepted by `subscription.update`. */
export type UpdateSubscriptionPayload = SchemaInput<
	typeof updateSubscriptionSchema
>;

/** Body accepted by `payment.voidInvoice`. */
export type VoidInvoicePayload = SchemaInput<typeof voidInvoiceSchema>;

/** Body accepted by `subscription.cron`. */
export type BillingCronPayload = SchemaInput<typeof billingCronSchema>;

/** A single catalog price entry. */
export type PlanPriceInput = SchemaInput<typeof planPriceInputSchema>;

/* -------------------------------------------------------------------------- */
/*                             List queries (server owned)                     */
/* -------------------------------------------------------------------------- */

/**
 * Query accepted by `subscription.list`, after the server's coercions.
 *
 * The output side is used on purpose: `z.input` types `limit` / `offset` as
 * `unknown` because the schema coerces them, while the coerced shape is what
 * the dashboard actually holds in its filter state.
 */
export type ListSubscriptionQuery = SchemaOutput<typeof listSubscriptionSchema>;

/** Query accepted by `payment.listInvoice`, after the server's coercions. */
export type ListInvoiceQuery = SchemaOutput<typeof listInvoiceSchema>;

/** Query accepted by `payment.listEvents`, after the server's coercions. */
export type ListEventsQuery = SchemaOutput<typeof listEventsSchema>;

/* -------------------------------------------------------------------------- */
/*                             Form state (dashboard owned)                    */
/* -------------------------------------------------------------------------- */

/**
 * Form state of the "create plan" dialog: a single price and a billing
 * interval.
 *
 * This is deliberately *not* the wire shape. The server expects a nested
 * `prices` array, and `useCreatePlanMutation` performs that translation; every
 * field the two shapes share is typed from `createPlanSchema` so a rename on
 * the server breaks the build instead of drifting silently.
 */
export type CreatePlanInput = {
	plan_id: CreatePlanPayload["plan_id"];
	name: CreatePlanPayload["name"];
	description?: CreatePlanPayload["description"];
	/** Flat form price; translated into `prices[0].amount` by the mutation. */
	price_amount: PlanPriceInput["amount"];
	interval?: PlanPriceInput["interval"];
	/** Monthly billable request allowance; `null` means unlimited. */
	quota_requests?: CreatePlanPayload["quota_requests"];
	features?: CreatePlanPayload["features"];
	highlighted?: CreatePlanPayload["highlighted"];
};

/**
 * Form state of the "edit plan" dialog.
 *
 * Same flat shape as {@link CreatePlanInput}; `useUpdatePlanMutation`
 * translates it into the nested `prices` array when a price is present.
 */
export type UpdatePlanInput = {
	plan_id: UpdatePlanPayload["plan_id"];
	name?: UpdatePlanPayload["name"];
	description?: UpdatePlanPayload["description"];
	/** Flat form price; translated into `prices[0].amount` by the mutation. */
	price_amount?: PlanPriceInput["amount"];
	interval?: PlanPriceInput["interval"];
	/** Monthly billable request allowance; `null` means unlimited. */
	quota_requests?: UpdatePlanPayload["quota_requests"];
	features?: UpdatePlanPayload["features"];
	highlighted?: UpdatePlanPayload["highlighted"];
};

/**
 * Body sent to `subscription.update`.
 *
 * The dashboard forwards this object verbatim, so it is the schema's own input
 * type — there is no form shape involved.
 */
export type UpdateSubscriptionInput = UpdateSubscriptionPayload;

/**
 * Body sent to `payment.voidInvoice`.
 *
 * The dashboard forwards this object verbatim, so it is the schema's own input
 * type — there is no form shape involved.
 */
export type VoidInvoiceInput = VoidInvoicePayload;

/**
 * Body sent to `subscription.cron`.
 *
 * The dashboard forwards this object verbatim, so it is the schema's own input
 * type — there is no form shape involved.
 */
export type BillingCronInput = BillingCronPayload;

/**
 * Filter state of the subscriptions table.
 *
 * `status` is the raw server filter (the schema accepts any string) and
 * `userId` mirrors the server's `user_id` query key; `search` is a purely
 * client-side term that is never sent to the server.
 */
export type SubscriptionFilters = {
	userId?: ListSubscriptionQuery["user_id"];
	status?: ListSubscriptionQuery["status"];
	limit?: ListSubscriptionQuery["limit"];
	offset?: ListSubscriptionQuery["offset"];
	/** Client-side search term; never sent to the server. */
	search?: string;
};

/**
 * Filter state of the invoices table.
 *
 * `status` / `invoice_type` are the raw server filters and `userId` mirrors
 * the server's `user_id` query key; `search` is a purely client-side term
 * that is never sent to the server.
 */
export type InvoiceFilters = {
	userId?: ListInvoiceQuery["user_id"];
	status?: ListInvoiceQuery["status"];
	invoice_type?: ListInvoiceQuery["invoice_type"];
	limit?: ListInvoiceQuery["limit"];
	offset?: ListInvoiceQuery["offset"];
	/** Client-side search term; never sent to the server. */
	search?: string;
};

/**
 * Filter state of the transaction events table.
 *
 * `event_name` is the raw server filter; `search` is a purely client-side
 * term that is never sent to the server.
 */
export type EventFilters = {
	limit?: ListEventsQuery["limit"];
	offset?: ListEventsQuery["offset"];
	event_name?: ListEventsQuery["event_name"];
	/** Client-side search term; never sent to the server. */
	search?: string;
};
