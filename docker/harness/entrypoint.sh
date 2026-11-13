#!/usr/bin/env bash

set -Eeuo pipefail

# -- Environment Configuration & Defaults ---------------------------
# DSH_HOME: Path to DSH configurations, profiles, and installed plugins
DSH_HOME="${DSH_HOME:-/home/node/.dsh}"

# DSH_WORKSPACE: Target workspace directory to cd into before running DSH
DSH_WORKSPACE="${DSH_WORKSPACE:-/workspace}"

# GATEWAY_PORT: Public HTTP port exposed by Caddy reverse proxy
GATEWAY_PORT="${GATEWAY_PORT:-8080}"

# DSH_INTERNAL_PORT: Internal loopback port for DSH web server (127.0.0.1)
DSH_INTERNAL_PORT="${DSH_INTERNAL_PORT:-3080}"

# DSH_READY_TIMEOUT: Maximum seconds to wait for DSH server readiness
DSH_READY_TIMEOUT="${DSH_READY_TIMEOUT:-60}"

# DSH_TRUSTED_HOST: External hostname expected by DSH (e.g. Cloudflare tunnel domain)
DSH_TRUSTED_HOST="${DSH_TRUSTED_HOST:-}"

# DSH_WEB_LOG: Temporary log file for DSH startup output and launch token capture
DSH_WEB_LOG="${DSH_WEB_LOG:-/tmp/dsh-web.log}"

# CADDYFILE: Path to Caddy configuration file
CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"

# PNPM_CONFIG_UPDATE_NOTIFIER: Disables pnpm registry update check on CLI executions
export PNPM_CONFIG_UPDATE_NOTIFIER="${PNPM_CONFIG_UPDATE_NOTIFIER:-false}"

# -- Runtime Directories & Workspace Setup --------------------------
mkdir -p "$DSH_HOME" "$DSH_WORKSPACE"

# -- CLI Command Bypass ---------------------------------------------
# If custom arguments are provided (not web flags), execute them directly.
if [ "$#" -gt 0 ]; then
	if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
		exec dsh web --help
	elif [ "$1" = "-v" ] || [ "$1" = "--version" ]; then
		exec dsh --version
	elif [ "$1" = "dsh" ] && [ "${2:-}" != "web" ]; then
		exec "$@"
	elif [ "$1" != "dsh" ] && [ "$1" != "web" ] && [ "${1#-}" = "$1" ]; then
		exec "$@"
	fi
fi

# -- Workspace Ownership Check --------------------------------------
if [ ! -w "$DSH_WORKSPACE" ]; then
	echo "[dsh] warning: $DSH_WORKSPACE is not writable by uid $(id -u)." >&2
	echo "[dsh]          If using a bind mount, ensure the host directory has write permissions for UID 1000." >&2
fi

# -- Probe bwrap sandbox -------------------------------------------
# Mirror DSH's own probe profile (dsh-sandbox-local's bwrapProfileArgs): the
# entrypoint must report what DSH will actually be able to enforce.
if bwrap --ro-bind / / --dev /dev --unshare-pid --proc /proc --die-with-parent -- true >/dev/null 2>&1; then
	echo "[dsh] bubblewrap sandbox: available ($(bwrap --version 2>/dev/null || echo unknown))"
else
	echo "[dsh] bubblewrap sandbox: unavailable - DSH has no usable confinement" >&2
	echo "[dsh]          backend and will refuse to run sandboxed commands (fail-closed)." >&2
	echo "[dsh]          bubblewrap >= 0.12 needs openat2 (Linux >= 5.6) and a build" >&2
	echo "[dsh]          without -Dassume_kernel; older kernels need bubblewrap <= 0.11." >&2
	echo "[dsh]          Reproduce with: bwrap --ro-bind / / true" >&2
fi

# Prepare log file with restricted permissions
if [ ! -w "$(dirname "$DSH_WEB_LOG")" ]; then
	echo "[dsh] error: $(dirname "$DSH_WEB_LOG") is not writable by uid $(id -u)." >&2
	exit 1
fi
: >"$DSH_WEB_LOG"
chmod 0600 "$DSH_WEB_LOG"

# -- Start DSH ------------------------------------------------------
start_dsh() {
	extra_args=()
	if [ "$#" -gt 0 ]; then
		if [ "$1" = "dsh" ] && [ "${2:-}" = "web" ]; then
			shift 2
			extra_args=("$@")
		elif [ "$1" = "web" ]; then
			shift 1
			extra_args=("$@")
		else
			extra_args=("$@")
		fi
	fi

	dsh_cmd=(dsh web --no-open --port "$DSH_INTERNAL_PORT")
	if [ -n "$DSH_TRUSTED_HOST" ]; then
		dsh_cmd+=(--trusted-host "$DSH_TRUSTED_HOST")
	fi
	if [ "${#extra_args[@]}" -gt 0 ]; then
		dsh_cmd+=("${extra_args[@]}")
	fi

	echo "[dsh] starting DSH (${dsh_cmd[*]} bound to 127.0.0.1:$DSH_INTERNAL_PORT) ..."
	"${dsh_cmd[@]}" >"$DSH_WEB_LOG" 2>&1 &
	DSH_PID=$!
}
export DSH_WORKSPACE
start_dsh "$@"

# -- Wait for DSH Readiness & Extract Launch Token -------------------
echo "[dsh] waiting for DSH readiness (127.0.0.1:$DSH_INTERNAL_PORT, up to ${DSH_READY_TIMEOUT}s) ..."
ready=0
waited=0
DSH_TOKEN=""

while [ "$waited" -lt "$DSH_READY_TIMEOUT" ]; do
	if [ -f "$DSH_WEB_LOG" ]; then
		DSH_TOKEN=$(grep -o 'token=[A-Za-z0-9_-]*' "$DSH_WEB_LOG" | head -n 1 | cut -d= -f2 || true)
	fi
	if [ -n "$DSH_TOKEN" ] && node -e "fetch(\"http://127.0.0.1:$DSH_INTERNAL_PORT/\").then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null; then
		ready=1
		break
	fi
	if ! kill -0 "$DSH_PID" 2>/dev/null; then
		echo "[dsh] error: DSH process exited (last log lines below)" >&2
		tail -n 20 "$DSH_WEB_LOG" >&2 || true
		exit 1
	fi
	waited=$((waited + 1))
	sleep 1
done

if [ "$ready" != "1" ] || [ -z "$DSH_TOKEN" ]; then
	echo "[dsh] error: DSH was not ready or launch token not found within ${DSH_READY_TIMEOUT}s" >&2
	tail -n 20 "$DSH_WEB_LOG" >&2 || true
	exit 1
fi

echo "[dsh] DSH ready (pid $DSH_PID, launch token acquired)"

# Scrub launchToken in-place in log file before streaming to stdout to prevent credential leakage
python3 -c "
import re
try:
    with open('$DSH_WEB_LOG', 'r+') as f:
        content = f.read()
        f.seek(0)
        f.write(re.sub(r'token=[A-Za-z0-9_-]+', 'token=[REDACTED]', content))
        f.truncate()
except Exception:
    pass
" 2>/dev/null || true

# Stream redacted logs to container stdout
tail -n +1 -f "$DSH_WEB_LOG" &
TAIL_PID=$!

export DSH_TOKEN

# -- Signal Handling & Caddy Gateway --------------------------------
cleaning=0
cleanup() {
	[ "$cleaning" = "1" ] && return 0
	cleaning=1
	echo "[dsh] exit signal received, stopping services ..." >&2
	[ -n "${CADDY_PID:-}" ] && kill "$CADDY_PID" 2>/dev/null || true
	[ -n "${DSH_PID:-}" ] && kill "$DSH_PID" 2>/dev/null || true
	[ -n "${TAIL_PID:-}" ] && kill "$TAIL_PID" 2>/dev/null || true
	[ -n "${CADDY_PID:-}" ] && wait "$CADDY_PID" 2>/dev/null || true
	[ -n "${DSH_PID:-}" ] && wait "$DSH_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[dsh] starting Caddy gateway on port $GATEWAY_PORT ..."
caddy run --config "$CADDYFILE" --adapter caddyfile &
CADDY_PID=$!

# Clear token from shell environment so subsequent child processes cannot read it
unset DSH_TOKEN

wait -n "$DSH_PID" "$CADDY_PID" || true
