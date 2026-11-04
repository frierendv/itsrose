# `@itsrose/types`

Global, purely type-only TypeScript utility types for the ItsRose monorepo.

This package ships zero runtime JavaScript — every export is a TypeScript type or interface, so importing it never adds code to your bundle.

## Utilities

- `Prettify<T>` — flattens mapped/intersected types for readable tooltips.
- `DeepPartial<T>` — makes all properties (and nested properties) optional.
- `ValueOf<T>` — extracts the value union of an object type.
- `Nullable<T>` — allows `null` or `undefined`.
- `Brand<T, B>` — nominal/branded typing to prevent mixing identical primitives.

## Example

```ts
import type { Brand, DeepPartial, Nullable, Prettify, ValueOf } from "@itsrose/types";

type UserId = Brand<string, "UserId">;
type PostId = Brand<string, "PostId">;

const userId = "u_1" as UserId;
// const postId: PostId = userId; // Type error — branded types are not interchangeable

type Config = Prettify<{ a: number } & { b: string }>;
type DraftConfig = DeepPartial<Config>;
type MaybeName = Nullable<string>;
type ConfigValue = ValueOf<Config>;
```
