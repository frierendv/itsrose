#!/bin/sh
# DSH container entrypoint - non-root runtime, with sandbox backend detection.
#
# Responsibilities:
#   1. Run DSH as an unprivileged user so files written into a bind-mounted
#      workspace are owned by that uid on the host, not root:root.
#      The state volume and /workspace may arrive root-owned (fresh named volume,
#      or leftovers from an earlier root run), so ownership is repaired while we
#      are still root, then the script re-executes itself via setpriv.
#   2. Pick a permission mode that actually works on this host:
#      DSH defaults to "workspace-write", which needs a real confinement backend.
#      DSH's own Linux runner chain is bubblewrap -> Landlock (kernel >= 5.13,
#      via the landlock-run launcher); Seatbelt is macOS-only. Without any of
#      them DSH fails closed: every tool call returns SANDBOX_UNAVAILABLE.
#      We probe both, then fall back to danger-full-access (the container is the
#      boundary) instead of leaving the agent unusable.
#   3. Keep that decision from silently degrading when DSH changes how it reads
#      the mode (see apply_permission_preset).
#   4. Start dsh web, wait until it answers, then hand the foreground to the
#      upstream reverse proxy and forward shutdown to both children.
#
# Base workspace: DSH has no --cwd flag; the session workspace defaults to the
# process cwd, and sandboxPolicy.workspaceRoot does too. So we cd to
# $DSH_WORKSPACE_ROOT (/workspace by default) before starting dsh web.

set -e

# -- Defaults -------------------------------------------------------
DSH_HOME="${DSH_HOME:-/home/node/.dsh}"
DSH_WORKSPACE_ROOT="${DSH_WORKSPACE_ROOT:-/workspace}"
DSH_PORT="${DSH_PORT:-3079}"
PROXY_PORT="${PROXY_PORT:-3080}"
DSH_RUN_AS="${DSH_RUN_AS:-node}"
DSH_CHOWN_WORKSPACE="${DSH_CHOWN_WORKSPACE:-1}"
# First boot installs the DSH web profile (~250 MB of bundles). On a slow link
# that takes minutes; timing out exits 1 and the restart policy retries from
# scratch, so the bound is generous and overridable.
DSH_READY_TIMEOUT="${DSH_READY_TIMEOUT:-600}"
# The authority browsers use for this deployment. Handed to DSH as
# `--trusted-host`, so the deployment names itself the way the public-deployment
# guide asks it to.
DSH_PUBLIC_HOST="${DSH_PUBLIC_HOST:-}"
DSH_TRUSTED_HOST="${DSH_TRUSTED_HOST:-$DSH_PUBLIC_HOST}"

# Keep runtime state out of /app, so /app can stay root-owned and read-only to us.
DSH_WEB_LOG="${DSH_WEB_LOG:-$DSH_HOME/.dsh-web.log}"
DSH_TOKEN_FILE_AUTO="${DSH_TOKEN_FILE_AUTO:-$DSH_HOME/.dsh-launch-token}"

# DSH_PORT is exported so the proxy reads the same source port we launched with
# even when it came from the shell default rather than the environment.
export DSH_HOME DSH_WEB_LOG DSH_TOKEN_FILE_AUTO DSH_WORKSPACE_ROOT DSH_PORT

PROFILE_PATCH="$DSH_HOME/profiles/web/cordis.patch.yml"
# Managed block markers. Anything between them belongs to this script; a
# defaultPreset the user wrote elsewhere in the file is never touched.
PRESET_BEGIN='# >>> dsh-harness: managed by entrypoint.sh, do not edit'
PRESET_END='# <<< dsh-harness: managed by entrypoint.sh'

DSH_ROOT=""

# -- Helpers --------------------------------------------------------
# Entrypoint-owned files: true when the top-level entry is already the runner's.
# A recursive chown of a large bind-mounted tree is expensive, so the common
# case (volume already handed over on a previous start) skips it.
owned_by_runner() {
	[ -e "$1" ] || return 0
	[ "$(stat -c %u "$1" 2>/dev/null)" = "$(id -u "$DSH_RUN_AS" 2>/dev/null)" ]
}

repair_owner() {
	label="$1"
	target="$2"
	[ -e "$target" ] || return 0
	if owned_by_runner "$target"; then
		echo "[init] $label already owned by $DSH_RUN_AS, skipping recursive chown ($target)"
		return 0
	fi
	echo "[init] repairing $label ownership: $target"
	chown -R "$DSH_RUN_AS" "$target" 2>/dev/null || true
}

# Installation root of the dsh package, derived from the launcher symlink so it
# works for both the global prefix and the admin variant's /opt/dsh.
resolve_dsh_root() {
	dsh_bin="$(command -v dsh 2>/dev/null)" || return 1
	dsh_real="$(readlink -f "$dsh_bin" 2>/dev/null || printf '%s\n' "$dsh_bin")"
	dsh_dir="$(CDPATH= cd -- "$(dirname -- "$dsh_real")/.." 2>/dev/null && pwd)" || return 1
	[ -f "$dsh_dir/package.json" ] || return 1
	printf '%s\n' "$dsh_dir"
}

# The prebuilt landlock-run launcher. node-addon-system resolves it from the
# per-platform package @deepseek-ai/node-addon-system-<platform>-<arch>/bin.
landlock_launcher() {
	[ -n "$DSH_ROOT" ] || return 1
	case "$(uname -m)" in
	x86_64 | amd64) node_arch=x64 ;;
	aarch64 | arm64) node_arch=arm64 ;;
	*) node_arch="$(uname -m)" ;;
	esac
	addon="$DSH_ROOT/node_modules/@deepseek-ai/node-addon-system"
	for candidate in \
		"$DSH_ROOT/node_modules/@deepseek-ai/node-addon-system-linux-$node_arch/bin/landlock-run" \
		"$addon/node_modules/@deepseek-ai/node-addon-system-linux-$node_arch/bin/landlock-run"; do
		if [ -x "$candidate" ]; then
			printf '%s\n' "$candidate"
			return 0
		fi
	done
	# npm may hoist or nest further than the two documented layouts.
	found="$(find "$addon" -maxdepth 5 -type f -name landlock-run 2>/dev/null | head -n 1)"
	[ -n "$found" ] || return 1
	printf '%s\n' "$found"
}

# Mirrors dsh-sandbox-local's bwrap profile: --ro-bind / / --dev /dev
# --unshare-pid --proc /proc --die-with-parent, plus the /tmp tmpfs and the
# workspace bind that workspace-write adds. Probing the shape DSH really runs
# matters: a bare `bwrap --ro-bind / / true` succeeds in places where the mount
# set DSH needs does not.
probe_bwrap() {
	command -v bwrap >/dev/null 2>&1 || return 1
	[ -d "$DSH_WORKSPACE_ROOT" ] || return 1
	bwrap --ro-bind / / --dev /dev --unshare-pid --proc /proc --die-with-parent \
		--tmpfs /tmp --bind "$DSH_WORKSPACE_ROOT" "$DSH_WORKSPACE_ROOT" \
		true >/dev/null 2>&1
}

# The launcher's own functional probe (`--probe`): exit 0 only when the running
# kernel actually enforces a Landlock ruleset, which a version check would miss.
probe_landlock() {
	launcher="$(landlock_launcher)" || return 1
	[ -x "$launcher" ] || return 1
	"$launcher" --probe >/dev/null 2>&1
}

# Sets SANDBOX_BACKEND and returns 0 when any backend answered. DSH tries
# bwrap first and Landlock second, so report in that order; a host where only
# Landlock works is still a workspace-write host.
SANDBOX_BACKEND=""
sandbox_probe() {
	if probe_bwrap; then
		SANDBOX_BACKEND="bwrap"
		return 0
	fi
	if probe_landlock; then
		SANDBOX_BACKEND="landlock"
		return 0
	fi
	SANDBOX_BACKEND="none"
	return 1
}

# Reads SANDBOX_BACKEND, which sandbox_probe() has already settled.
resolve_mode() {
	# 1) explicit override wins
	if [ -n "$DSH_PERMISSION_MODE" ]; then
		case "$DSH_PERMISSION_MODE" in
		read-only | workspace-write | danger-full-access)
			echo "$DSH_PERMISSION_MODE"
			return 0
			;;
		*)
			echo "[dsh] error: unknown DSH_PERMISSION_MODE=$DSH_PERMISSION_MODE" >&2
			return 1
			;;
		esac
	fi
	# 2) auto-detect
	if [ "$SANDBOX_BACKEND" != "none" ] && [ -n "$SANDBOX_BACKEND" ]; then
		echo "workspace-write"
	else
		echo "danger-full-access"
	fi
}

# -- Patch-layer helpers --------------------------------------------
# dsh-base reads the mode from DSH_PERMISSION_MODE only because its own
# cordis.patch.yml evaluates `!!js process.env.DSH_PERMISSION_MODE ?? 'workspace-write'`.
# That is a patch-layer detail, not a CLI contract. If a future DSH drops the
# expression the env var is ignored and DSH keeps its built-in workspace-write
# default -- on a host with no backend the agent then fails closed on every
# tool call while this script believes it selected danger-full-access. Detect
# the hook, and when it is gone pin the preset through the profile's own user
# layer instead (the documented per-profile cordis.patch.yml, applied after
# every bundle layer).
env_hook_present() {
	hook_file="$DSH_ROOT/node_modules/@deepseek-ai/dsh-base/cordis.patch.yml"
	[ -n "$DSH_ROOT" ] && [ -f "$hook_file" ] &&
		grep -q 'process\.env\.DSH_PERMISSION_MODE' "$hook_file"
}

# A patch file holding only comments is not an empty list, it is an invalid
# document (the loader requires a top-level YAML array), so such a file is
# removed rather than left behind.
has_patch_content() {
	[ -f "$PROFILE_PATCH" ] && grep -qvE '^[[:space:]]*(#|$)' "$PROFILE_PATCH" 2>/dev/null
}

strip_preset_block() {
	[ -f "$PROFILE_PATCH" ] || return 0
	# Leave the user's file byte-identical when it holds nothing of ours: it is
	# watched for changes, and rewriting it on every boot is needless noise.
	grep -q '^# >>> dsh-harness:' "$PROFILE_PATCH" 2>/dev/null || return 0
	if sed '/^# >>> dsh-harness:/,/^# <<< dsh-harness:/d' "$PROFILE_PATCH" >"$PROFILE_PATCH.tmp" 2>/dev/null; then
		mv "$PROFILE_PATCH.tmp" "$PROFILE_PATCH"
	else
		rm -f "$PROFILE_PATCH.tmp"
	fi
	if ! has_patch_content; then
		rm -f "$PROFILE_PATCH"
	fi
}

user_pins_preset() {
	[ -f "$PROFILE_PATCH" ] && grep -qE '^[[:space:]]*defaultPreset:' "$PROFILE_PATCH"
}

report_user_pin() {
	pinned="$(sed -n 's/^[[:space:]]*defaultPreset:[[:space:]]*\([^[:space:]#]*\).*/\1/p' "$PROFILE_PATCH" | tail -n 1)"
	echo "[dsh] warning: $PROFILE_PATCH pins defaultPreset=${pinned:-?} itself," >&2
	echo "[dsh]          so sessions follow that preset, not $1." >&2
	echo "[dsh]          Delete that line to let the probe decide, or set it to $1." >&2
}

pin_default_preset() {
	preset="$1"
	mkdir -p "$(dirname "$PROFILE_PATCH")" 2>/dev/null || true
	strip_preset_block
	if [ -f "$PROFILE_PATCH" ]; then
		# The profile template ships as a `[]` document, and a block entry
		# cannot follow a inline empty sequence: drop the placeholder.
		grep -vE '^[[:space:]]*\[\][[:space:]]*$' "$PROFILE_PATCH" >"$PROFILE_PATCH.tmp" 2>/dev/null || true
		[ -f "$PROFILE_PATCH.tmp" ] && mv "$PROFILE_PATCH.tmp" "$PROFILE_PATCH"
	fi
	{
		printf '%s\n' "$PRESET_BEGIN"
		printf -- '- id: permission\n'
		printf '  config:\n'
		printf '    defaultPreset: %s\n' "$preset"
		printf '%s\n' "$PRESET_END"
	} >>"$PROFILE_PATCH"
	echo "[dsh] pinned defaultPreset=$preset in $PROFILE_PATCH"
}

# $1 = resolved mode, $2 = 1 when the mode came from the no-backend fallback
# (the case where a silent downgrade would leave the agent unable to run
# anything, so the decision is also written into the profile layer).
apply_permission_preset() {
	mode="$1"
	fallback="$2"
	strip_preset_block # always start from the user's own content
	if user_pins_preset; then
		report_user_pin "$mode"
		return 0
	fi
	if env_hook_present; then
		echo "[dsh] mode is carried by dsh-base's DSH_PERMISSION_MODE hook"
		if [ "$fallback" = "1" ]; then
			pin_default_preset "$mode"
		fi
		return 0
	fi
	echo "[dsh] warning: dsh-base no longer reads DSH_PERMISSION_MODE;" >&2
	echo "[dsh]          pinning the preset in the profile layer instead." >&2
	pin_default_preset "$mode"
}

# -- Drop root privileges -------------------------------------------
# Skipped for the admin variant (it installs DSH into /opt/dsh and needs root),
# and skipped when DSH_RUN_AS=root is requested explicitly.
if [ "$(id -u)" = "0" ] && [ "$DSH_RUN_AS" != "root" ] && [ ! -f /app/.admin-mode ]; then
	if ! id "$DSH_RUN_AS" >/dev/null 2>&1; then
		echo "[init] error: user \"$DSH_RUN_AS\" does not exist; cannot drop privileges" >&2
		exit 1
	fi
	echo "[init] checking ownership (state: $DSH_HOME, workspace: $DSH_WORKSPACE_ROOT) ..."
	repair_owner "state" "$DSH_HOME"
	if [ "$DSH_CHOWN_WORKSPACE" = "1" ]; then
		repair_owner "workspace" "$DSH_WORKSPACE_ROOT"
	fi
	# The log and token files may sit outside DSH_HOME when overridden; make sure
	# their directories exist and belong to the unprivileged user before dropping.
	for d in "$(dirname "$DSH_WEB_LOG")" "$(dirname "$DSH_TOKEN_FILE_AUTO")"; do
		mkdir -p "$d" 2>/dev/null || true
		chown "$DSH_RUN_AS" "$d" 2>/dev/null || true
	done
	if command -v setpriv >/dev/null 2>&1; then
		exec setpriv --reuid="$DSH_RUN_AS" --regid="$DSH_RUN_AS" --init-groups "$0" "$@"
	elif command -v gosu >/dev/null 2>&1; then
		exec gosu "$DSH_RUN_AS" "$0" "$@"
	else
		echo "[init] error: neither setpriv nor gosu is available; rebuild with util-linux" >&2
		exit 1
	fi
fi

echo "[init] running as uid=$(id -u) gid=$(id -g) ($(id -un 2>/dev/null || echo unknown))"

# -- Non-root cannot bind privileged ports --------------------------
if [ "$(id -u)" != "0" ] && [ "$PROXY_PORT" -lt 1024 ] 2>/dev/null; then
	echo "[proxy] warning: uid $(id -u) cannot bind port $PROXY_PORT; using 3080 instead." >&2
	echo "[proxy]          publish it on the host instead: -p 80:3080" >&2
	PROXY_PORT=3080
fi

# -- The proxy is the only gate in front of a shell -----------------
# Anything that reaches $PROXY_PORT can drive an agent with a bash tool over
# $DSH_WORKSPACE_ROOT and read the credentials in $DSH_HOME. The upstream proxy
# enables HTTP Basic Auth only when both variables are set, and its `/` handler
# redeems the DSH launch token automatically, so there is no second gate behind
# it. Running without it is fine *only* when an edge policy (Cloudflare Access /
# a tunnel-side rule) authenticates callers first -- this script cannot see that
# policy, so it still says so.
if [ -z "${PROXY_USERNAME:-}" ] || [ -z "${PROXY_PASSWORD:-}" ]; then
	echo "[proxy] note: no in-container Basic Auth (PROXY_USERNAME/PROXY_PASSWORD unset)." >&2
	echo "[proxy]       Anything that can route to port $PROXY_PORT reaches this agent; rely on" >&2
	echo "[proxy]       Cloudflare Access / a tunnel policy, not on the hostname being unlisted." >&2
fi

# -- Locate the DSH installation ------------------------------------
DSH_ROOT="$(resolve_dsh_root || true)"
if [ -n "$DSH_ROOT" ]; then
	echo "[dsh] installation: $DSH_ROOT"
else
	echo "[dsh] warning: could not derive the dsh installation root;" >&2
	echo "[dsh]          backend probing and the preset guard are limited." >&2
fi

# -- Admin variant keeps root and hands over to the manager ---------
if [ -f /app/.admin-mode ]; then
	echo "[admin] admin variant detected, starting DSH management service ..."
	exec node /app/manager/index.js
fi

# -- Select permission mode -----------------------------------------
# Probe once, as the unprivileged user (user namespaces are what bwrap needs and
# root masks the answer), then let both the report and the mode read the result.
sandbox_probe || true
MODE="$(resolve_mode)"

if [ "$MODE" = "workspace-write" ] && [ "$SANDBOX_BACKEND" = "none" ]; then
	echo "[dsh] warning: workspace-write selected but no usable confinement backend is present;" >&2
	echo "[dsh]          tool calls will fail with SANDBOX_UNAVAILABLE. Consider danger-full-access." >&2
fi

MODE_FALLBACK=0
if [ "$MODE" = "danger-full-access" ] && [ -z "$DSH_PERMISSION_MODE" ]; then
	MODE_FALLBACK=1
fi

export DSH_PERMISSION_MODE="$MODE"

# Report the backend once, whichever way the mode was chosen.
case "$SANDBOX_BACKEND" in
"" | none) echo "[dsh] sandbox backend: none detected" ;;
*) echo "[dsh] sandbox backend: $SANDBOX_BACKEND" ;;
esac

apply_permission_preset "$MODE" "$MODE_FALLBACK"

echo "[dsh] permission mode: $MODE (explicit DSH_PERMISSION_MODE wins; otherwise probed)"

# -- Base workspace -------------------------------------------------
# DSH derives the session workspace and sandbox fallback from the process cwd.
if ! cd "$DSH_WORKSPACE_ROOT" 2>/dev/null; then
	echo "[dsh] warning: cannot enter $DSH_WORKSPACE_ROOT (missing or not accessible);" >&2
	echo "[dsh]          staying in $(pwd). Create it and make it writable by uid $(id -u)." >&2
fi

if [ ! -w "$(dirname "$DSH_WEB_LOG")" ]; then
	echo "[dsh] error: $(dirname "$DSH_WEB_LOG") is not writable by uid $(id -u)." >&2
	echo "[dsh]        Keep DSH_WEB_LOG under DSH_HOME, or fix that directory's ownership." >&2
	exit 1
fi

echo "[dsh] workspace: $(pwd) (change with DSH_WORKSPACE_ROOT)"
echo "[dsh] starting DSH (dsh web --port $DSH_PORT${DSH_TRUSTED_HOST:+, --trusted-host $DSH_TRUSTED_HOST}) ..."

# DSH output goes to $DSH_WEB_LOG (under DSH_HOME): the proxy upstream-token.js reads
# that file to recover the launch token, and it honours DSH_WEB_LOG. Redirect straight
# to the file (immediate, no pipe buffering) and mirror it with tail -f.
# NOTE: do not use "| tee" - $! would then be tee PID and cleanup would kill the wrong process.
#
# --trusted-host is passed last: it is the variadic option (`<authority...>`), so
# anything after it would be swallowed as another authority.
#
# Worth knowing: under this image's proxy the Host that reaches DSH is always
# 127.0.0.1:$DSH_PORT (changeOrigin), and dshmarket's declared-authority branch
# ignores loopback Hosts by design, so this flag is inert here — it keeps the
# deployment self-describing for the day the proxy preserves Host instead. What
# actually unblocks those routes is strip-forwarded.cjs.
start_dsh() {
	set -- web --no-open --port "$DSH_PORT"
	if [ -n "$DSH_TRUSTED_HOST" ]; then
		set -- "$@" --trusted-host "$DSH_TRUSTED_HOST"
	fi
	dsh "$@" >"$DSH_WEB_LOG" 2>&1 &
	DSH_PID=$!
}

start_dsh
tail -f "$DSH_WEB_LOG" &

# -- Wait for DSH readiness -----------------------------------------
echo "[dsh] waiting for DSH readiness (127.0.0.1:$DSH_PORT, up to ${DSH_READY_TIMEOUT}s) ..."
ready=0
waited=0
while [ "$waited" -lt "$DSH_READY_TIMEOUT" ]; do
	if node -e "fetch(\"http://127.0.0.1:$DSH_PORT/\").then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null; then
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

if [ "$ready" != "1" ]; then
	echo "[dsh] error: DSH was not ready within ${DSH_READY_TIMEOUT}s" >&2
	echo "[dsh]        First boot installs the profile; raise DSH_READY_TIMEOUT on a slow link." >&2
	tail -n 20 "$DSH_WEB_LOG" >&2 || true
	exit 1
fi
echo "[dsh] DSH ready (pid $DSH_PID)"

# -- Shut both children down together -------------------------------
# The proxy below stays in the foreground via wait, so these traps stay live;
# `exec`-ing it would discard them. `init: true` in compose/docker run makes
# docker-init forward SIGTERM here, and DSH gets a real SIGTERM (it shuts down
# within a bounded 5s) instead of being killed by namespace teardown.
cleaning=0
cleanup() {
	[ "$cleaning" = "1" ] && return 0
	cleaning=1
	echo "[proxy] exit signal received, stopping proxy and DSH ..." >&2
	[ -n "${PROXY_PID:-}" ] && kill "$PROXY_PID" 2>/dev/null || true
	[ -n "${DSH_PID:-}" ] && kill "$DSH_PID" 2>/dev/null || true
	[ -n "${DSH_PID:-}" ] && wait "$DSH_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# -- Start the proxy (foreground via wait, keeps the container alive) ----
echo "[proxy] starting proxy: 0.0.0.0:$PROXY_PORT -> 127.0.0.1:$DSH_PORT (uid $(id -u))"
cd /app/proxy

start_proxy() {
	if [ -f /app/harness/strip-forwarded.cjs ]; then
		echo "[proxy] dropping X-Forwarded-For / X-Real-Ip / Forwarded before DSH"
		node --require /app/harness/strip-forwarded.cjs index.js &
	else
		node index.js &
	fi
	PROXY_PID=$!
}

start_proxy
wait "$PROXY_PID" || true
