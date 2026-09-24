# `@itsrose/eslint-config`

Shared ESLint flat-config presets for the ItsRose monorepo. The package exposes focused config entrypoints so packages can opt into the right ruleset without duplicating setup.

## Exports

- `@itsrose/eslint-config/base`
- `@itsrose/eslint-config/next-js`
- `@itsrose/eslint-config/react-internal`

## Usage

```js
import base from "@itsrose/standard/eslint/base";

export default [...base];
```
