# `@itsrose/common`

Common shared types utilities used across the monorepo. This package stays intentionally small so feature packages can depend on it without pulling in heavier helpers.

## Overview

- `SyncState` defines the canonical sync lifecycle values.

## Example

```ts
import { SyncState } from "@itsrose/common";

if (state === SyncState.COMPLETED) {
	console.log("sync finished");
}
```
