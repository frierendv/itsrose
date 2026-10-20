# WHY?

Creating all route page manual to satisfy not-found page :thumb

## TAKEN ROUTE LIST

- forget-password
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
for _route_name in "${_AUTH[@]}"; do
	_auth_folder="$_current_dir/$_route_name"
	mkdir -p $_auth_folder
	touch "$_auth_folder/index.ts"
	_page="$_route_name-page"
	touch "$_auth_folder/$_page.tsx"
	echo "export * from \"./${_page}\";" >>"$_auth_folder/index.ts"
done
```
