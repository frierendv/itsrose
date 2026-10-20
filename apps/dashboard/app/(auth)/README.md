# WHY?

Creating all route page manual to satisfy not-found page :thumb

## TAKEN ROUTE LIST

- forgot-password
- redirect
- reset-link-password
- sign-in
- sign-out
- sign-up
- verify-email

```sh
#!/usr/bin/env bash

_AUTH=("forget-password" "redirect" "reset-link-password" "sign-in" "sign-out" "sign-up" "verify-email")

_current_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
for _folder in "${_AUTH[@]}"; do
	_auth_folder="$_current_dir/$_folder"
	mkdir $_auth_folder
	touch "$_auth_folder/page.tsx"
	echo "export { K as default, generateMetadata } from \"@/server/auth/${_folder}\";" >>"$_auth_folder/page.tsx"
done
```
