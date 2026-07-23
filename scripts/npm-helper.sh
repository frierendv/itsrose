#!/usr/bin/env bash

# npm-helper.sh

log_info() { echo -e "\033[1;33m[npm-helper]\033[0m $1"; }
log_success() { echo -e "\033[0;32m[npm-helper]\033[0m $1"; }
log_error() { echo -e "\033[0;31m[npm-helper]\033[0m $1"; }

check_registry() {
	local registry="${1}"
	if ! curl --output /dev/null --silent --head --fail "$registry"; then
		log_error "Verdaccio is not responding at: $registry"
		log_error "Please start your local registry before running this command."
		return 1
	fi
}

# _get_workspace_packages queries npm for all public workspace packages.
# It prints the package names to stdout and returns 1 if none are found.
_get_workspace_packages() {
	local packages
	packages=$(npm query .workspace --json 2>/dev/null | jq -r '.[] | select(has("private") | not) | .name')

	if [ -z "$packages" ]; then
		log_error "No workspace packages found. Ensure you are running this from the monorepo root."
		return 1 # fail
	fi
	echo "$packages"
	return 0 # success
}

unpublish() {
	local registry="${REGISTRY:-http://localhost:4873/}"
	log_info "Verifying connection to $registry..."
	check_registry "$registry" || return 1

	log_info "Scanning workspace packages..."
	local packages
	packages=$(_get_workspace_packages) || return 1

	for pkg in $packages; do
		log_info "Attempting to unpublish: $pkg..."

		local output
		# Capture stderr to a variable. The '|| true' prevents the script from exiting if npm fails.
		output=$(npm unpublish "$pkg" --registry "$registry" --force 2>&1 >/dev/null) || true

		if [ -z "$output" ]; then
			log_success "Successfully unpublished: $pkg"
		else
			# Clean up npm's error prefix for a tidier log message.
			log_info "Skipped $pkg: $(echo "$output" | sed 's/npm ERR! //')"
		fi
	done

	log_success "Unpublish cycle complete."
	return 0
}

publish() {
	local registry="${REGISTRY:-http://localhost:4873/}"
	log_info "Verifying connection to $registry..."
	check_registry "$registry" || return 1

	log_info "Scanning workspace packages..."
	local packages
	packages=$(_get_workspace_packages) || return 1

	for pkg in $packages; do
		log_info "Attempting to publish: $pkg..."

		local output
		# Capture stderr to a variable. The '|| true' prevents the script from exiting if npm fails.
		output=$(npm publish --workspace "$pkg" --registry "$registry" --force 2>&1 >/dev/null) || true

		if [ -z "$output" ]; then
			log_success "Successfully published: $pkg"
		else
			log_info "$pkg: $(echo "$output" | sed 's/npm ERR! //')"
		fi
	done
}

usage() {
	echo "Usage: npm-helper <command>"
	echo ""
	echo "Commands:"
	echo "  publish      Publish all public workspaces to the local registry"
	echo "  unpublish    Force-unpublish all workspace packages from the local registry"
	echo "  help         Show this help message"
	echo ""
	echo "Environment Variables:"
	echo "  REGISTRY     Target registry URL (default: http://localhost:4873/)"
}

# Main entry point for the script
main() {
	local command="${1:-help}"
	case "$command" in
	publish) publish ;;
	unpublish) unpublish ;;
	help | --help | -h) usage ;;
	*)
		log_error "Unknown command: $1"
		echo ""
		usage
		return 1
		;;
	esac
}

# If the script is being executed directly, call the main function.
# This prevents the main logic from running if the script is sourced.
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
	main "$@"
fi
