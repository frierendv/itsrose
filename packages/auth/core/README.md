# `@itsrose/auth`

Authentication composition root for the ItsRose platform, built on top of Better Auth.

## Packages

| Package                        | Description                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `@itsrose/auth` (this package) | Better Auth server, React client, shared env/config, plugin assembly                                |
| `@itsrose/auth-billing`        | SaaS billing domain (plans, subscriptions, proration, invoices, Midtrans webhooks, cron) and plugin |
| `@itsrose/auth-mailer`         | Eusend-backed transactional email service and plugin                                                |
| `@itsrose/auth-storage`        | S3-backed ephemeral storage service and plugin                                                      |

## Installation

```bash
pnpm add @itsrose/auth
```

## Usage

```ts
import { createBetterAuthClient } from "@itsrose/auth/react";
import { createBetterAuthServer } from "@itsrose/auth/server";
```

Billing-only helpers (formatters, proration previews, types) must be imported
from `@itsrose/auth-billing` / `@itsrose/auth-billing/client` so browser
bundles never pull server code. For implementation details, refer to the
[source code](./src).
