#!/bin/sh
# DSH container entrypoint - non-root runtime, with sandbox backend detection.
#
# Two responsibilities:
#   1. Run DSH as an unprivileged user so files written into a bind-mounted
#      workspace are owned by that uid on the host, not root:root.
#      The state volume and /workspace may arrive root-owned (fresh named volume,
#      or leftovers from an earlier root run), so ownership is repaired while we
#      are still root, then the script re-executes itself via setpriv.
#   2. Pick a permission mode that actually works on this host:
#      DSH defaults to "workspace-write", which needs a real confinement backend:
#        - Landlock   : kernel >= 5.13
#        - bubblewrap : usable user namespaces (often needs --security-opt seccomp=unconfined)
#        - Seatbelt   : macOS only
#      Without one, DSH fails closed: every tool call returns SANDBOX_UNAVAILABLE.
#      We probe, then fall back to danger-full-access (the container is the boundary).
#
# Base workspace: DSH has no --cwd flag; the session workspace defaults to the
# process cwd, and sandboxPolicy.workspaceRoot does too. So we cd to $DSH_WORKSPACE_ROOT
# (/workspace by default) before starting dsh web.

set -e

# -- Defaults -------------------------------------------------------
DSH_HOME="${DSH_HOME:-/home/node/.dsh}"
DSH_WORKSPACE_ROOT="${DSH_WORKSPACE_ROOT:-/workspace}"
DSH_PORT="${DSH_PORT:-3079}"
PROXY_PORT="${PROXY_PORT:-3080}"
DSH_RUN_AS="${DSH_RUN_AS:-node}"
DSH_CHOWN_WORKSPACE="${DSH_CHOWN_WORKSPACE:-1}"

DSH_WEB_URL="${DSH_WEB_URL:-}"

# Keep runtime state out of /app, so /app can stay root-owned and read-only to us.
DSH_WEB_LOG="${DSH_WEB_LOG:-$DSH_HOME/.dsh-web.log}"
DSH_TOKEN_FILE_AUTO="${DSH_TOKEN_FILE_AUTO:-$DSH_HOME/.dsh-launch-token}"

export DSH_HOME DSH_WEB_LOG DSH_TOKEN_FILE_AUTO DSH_WORKSPACE_ROOT DSH_WEB_URL

# -- Drop root privileges -------------------------------------------
# Skipped for the admin variant (it installs DSH into /opt/dsh and needs root),
# and skipped when DSH_RUN_AS=root is requested explicitly.
if [ "$(id -u)" = "0" ] && [ "$DSH_RUN_AS" != "root" ] && [ ! -f /app/.admin-mode ]; then
	if ! id "$DSH_RUN_AS" >/dev/null 2>&1; then
		echo "[init] error: user \"$DSH_RUN_AS\" does not exist; cannot drop privileges" >&2
		exit 1
	fi
	echo "[init] repairing ownership (state: $DSH_HOME, workspace: $DSH_WORKSPACE_ROOT) ..."
	chown -R "$DSH_RUN_AS" "$DSH_HOME" 2>/dev/null || true
	if [ "$DSH_CHOWN_WORKSPACE" = "1" ]; then
		chown -R "$DSH_RUN_AS" "$DSH_WORKSPACE_ROOT" 2>/dev/null || true
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

# -- Sandbox backend probe ------------------------------------------
# Checks that bwrap exists AND can really create pid/mount namespaces.
# --unshare-pid is closer to what DSH needs than a bare --ro-bind; if it fails we
# treat the backend as unusable - danger-full-access beats a half-broken workspace-write.
sandbox_probe() {
	command -v bwrap >/dev/null 2>&1 || return 1
	bwrap --unshare-pid --ro-bind / / true >/dev/null 2>&1 || return 1
	return 0
}

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
	if sandbox_probe; then
		echo "workspace-write"
	else
		echo "danger-full-access"
	fi
}

# Warn when the profile pins defaultPreset to a conflicting value: the session then
# follows the pinned preset and the environment variable has no effect.
warn_if_profile_pins_preset() {
	mode="$1"
	patch_file="$DSH_HOME/profiles/web/cordis.patch.yml"
	[ -f "$patch_file" ] || return 0
	pinned="$(sed -n "s/^[[:space:]]*defaultPreset:[[:space:]]*\([^[:space:]#]*\).*/\1/p" "$patch_file" | tail -n 1)"
	[ -n "$pinned" ] || return 0
	if [ "$pinned" != "$mode" ]; then
		echo "[dsh] warning: $patch_file pins defaultPreset=$pinned, conflicting with $mode." >&2
		echo "[dsh]          sessions will still run as $pinned; remove that line or set it to $mode." >&2
	fi
}

# -- Admin variant keeps root and hands over to the manager ---------
if [ -f /app/.admin-mode ]; then
	echo "[admin] admin variant detected, starting DSH management service ..."
	exec node /app/manager/index.js
fi

# -- Select permission mode -----------------------------------------
MODE="$(resolve_mode)"
export DSH_PERMISSION_MODE="$MODE"

if [ "$MODE" = "workspace-write" ] && ! sandbox_probe; then
	echo "[dsh] warning: workspace-write selected but no usable confinement backend is present;" >&2
	echo "[dsh]          tool calls will fail with SANDBOX_UNAVAILABLE. Consider danger-full-access." >&2
fi

warn_if_profile_pins_preset "$MODE"

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

echo "[dsh] permission mode: $MODE (explicit DSH_PERMISSION_MODE wins; otherwise probed)"
echo "[dsh] workspace: $(pwd) (change with DSH_WORKSPACE_ROOT)"
echo "[dsh] starting DSH (dsh web --port $DSH_PORT) ..."

# DSH output goes to $DSH_WEB_LOG (under DSH_HOME): the proxy upstream-token.js reads
# that file to recover the launch token, and it honours DSH_WEB_LOG. Redirect straight
# to the file (immediate, no pipe buffering) and mirror it with tail -f.
# NOTE: do not use "| tee" - $! would then be tee PID and cleanup would kill the wrong process.
dsh web --no-open --port "$DSH_PORT" >"$DSH_WEB_LOG" 2>&1 &
DSH_PID=$!
tail -f "$DSH_WEB_LOG" &

# -- Wait for DSH readiness (up to 120s) ----------------------------
echo "[dsh] waiting for DSH readiness (127.0.0.1:$DSH_PORT) ..."
ready=0
i=0
while [ "$i" -lt 120 ]; do
	if node -e "fetch(\"http://127.0.0.1:$DSH_PORT/\").then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null; then
		ready=1
		break
	fi
	if ! kill -0 "$DSH_PID" 2>/dev/null; then
		echo "[dsh] error: DSH process exited (last log lines below)" >&2
		tail -n 20 "$DSH_WEB_LOG" >&2 || true
		exit 1
	fi
	i=$((i + 1))
	sleep 1
done

if [ "$ready" != "1" ]; then
	echo "[dsh] error: DSH was not ready within 120s" >&2
	exit 1
fi
echo "[dsh] DSH ready (pid $DSH_PID)"

# -- Shut DSH down together with the container ----------------------
cleanup() {
	echo "[proxy] exit signal received, stopping DSH ..."
	kill "$DSH_PID" 2>/dev/null || true
	wait "$DSH_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# -- Start the proxy (foreground, keeps the container alive) --------
echo "[proxy] starting proxy: 0.0.0.0:$PROXY_PORT -> 127.0.0.1:$DSH_PORT (uid $(id -u))"
cd /app/proxy
exec node index.js
