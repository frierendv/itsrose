# `@itsrose/lowdb`

Document-style file-backed database built on collection adapters. It is inspired by lowdb, but tailored for the ItsRose workspace and its async document lifecycle.

## Overview

- `Low` manages typed collections and lazy collection creation.
- `Adapter` provides the filesystem-backed persistence layer.
- `CryptoAdapter` secure the data using `crypto` encryption.
- `SuperJSONAdapter` preserves richer JavaScript values when persisting documents.

## Example

```ts
import { Low, SuperJSONAdapter } from "@itsrose/lowdb";

interface AppDatabase {
	users: {
		name: string;
		class: number;
		time: Date;
	};
}

const db = new Low<AppDatabase>(new SuperJSONAdapter({ rootDir: "data" }));
const users = db.collection("users"); // db.handler.users

const user = await users.get("dave_user_id_xxx");
user.name = user.name ?? "dave";
await user.save();
```

Use `await using` with documents when you want changes to flush automatically on disposal.
