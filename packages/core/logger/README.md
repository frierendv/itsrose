# `@itsrose/logger`

Shared pino-based logger utilities for ItsRose services. The package keeps logger setup consistent while still allowing custom levels, colors, and transport behavior.

## Overview

- `createPino` builds a configured pino instance with the shared transport.
- `pinoTransport` and the transport helpers format output for readable local development logs.
- The exported types cover custom level maps and transport options.

## Example

```ts
import { createPino } from "@itsrose/logger";
import pino from "pino";

const logger = createPino(pino, {
	appName: "itsrose-api",
});

logger.info("service started");
```
