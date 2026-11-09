# Private custom image: layered on the published image, nothing rebuilt or patched.
#
#   BASE: smanx/deepseek-harness:devtools-min-0.2.2-rc.1
#   (upstream tags are floating: devtools-min-latest moves with every DSH
#    release. The version tag is pinned here on purpose -- a rebuild should not
#    silently swap DSH underneath you.)
#
# Changes over the upstream image:
#   1. Runs as the unprivileged "node" user (uid 1000) instead of root, so files
#      written into a bind-mounted workspace are owned by that uid on the host
#      instead of root:root. A short root phase in the entrypoint repairs volume
#      ownership, then re-executes itself via setpriv.
#   2. Base workspace is /workspace: DSH has no --cwd flag, so the session workspace
#      defaults to the process cwd; the entrypoint cds there before starting dsh web.
#   3. Installs bubblewrap and probes it (plus the Landlock launcher) at startup;
#      when no confinement backend is usable (e.g. CentOS 7 / kernel 3.10) it falls
#      back to danger-full-access instead of failing closed with SANDBOX_UNAVAILABLE.
#   4. Adds gh, rsync, python3 and tree on top of the devtools-min tool set.
#   5. Keeps everything DSH downloads at runtime inside $DSH_HOME (pnpm store, npm
#      cache, agent config), so recreating the container does not re-download the
#      profile or re-install plugins.
#
# Usage:
#   docker compose up -d --build            # preferred: see docker-compose.yml
#
#   docker run -d --name dsh-harness \
#     -p 127.0.0.1:80:3080 \
#     -v dsh-data:/home/node/.dsh \
#     -v /home/you/project:/workspace \
#     <your-registry>/deepseek-harness:nonroot
#
#   Add `-e PROXY_USERNAME=you -e PROXY_PASSWORD=secret` only when nothing else
#   authenticates the caller; the proxy is otherwise open to anyone who reaches
#   the port.
#
# NOTE: the state volume path changed from /root/.dsh to /home/node/.dsh.
# Reusing an old /root/.dsh mount here would be ignored and DSH would rebuild its
# profile inside the container layer (about 250 MB).

ARG BASE_IMAGE=smanx/deepseek-harness:devtools-min-0.2.2-rc.1
FROM ${BASE_IMAGE}

LABEL org.opencontainers.image.description="smanx/deepseek-harness devtools-min, non-root, workspace /workspace, sandbox auto-detect"
LABEL org.opencontainers.image.source="https://github.com/smanx/deepseek-harness-docker"

USER root

# github cli (gh) https://github.com/cli/cli/blob/trunk/docs/install_linux.md#debian
# plus bubblewrap, one of the backends workspace-write can use. Without any
# backend the entrypoint degrades to danger-full-access instead of leaving the
# agent unusable.
#
# NOTE: no `sudo` anywhere in here. This is root already, and neither
# node:24-slim nor any upstream devtools variant ships sudo -- a `sudo` line
# fails the build with exit 127.
RUN set -eux; \
	apt-get update; \
	apt-get install -y --no-install-recommends ca-certificates wget; \
	install -d -m 0755 /etc/apt/keyrings; \
	wget -qO /etc/apt/keyrings/githubcli-archive-keyring.gpg \
	https://cli.github.com/packages/githubcli-archive-keyring.gpg; \
	chmod 0644 /etc/apt/keyrings/githubcli-archive-keyring.gpg; \
	printf 'deb [arch=%s signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main\n' \
	"$(dpkg --print-architecture)" > /etc/apt/sources.list.d/github-cli.list; \
	apt-get update; \
	apt-get install -y --no-install-recommends bubblewrap rsync python3 gh tree libatomic1; \
	rm -rf /var/lib/apt/lists/*

# Workspace plus an unprivileged state dir. Both are chowned so the drop-privileges
# step can hand them to "node" without touching the rest of the image.
RUN mkdir -p /workspace /home/node/.dsh \
	&& chown -R node:node /workspace /home/node/.dsh

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod 0755 /app/entrypoint.sh

# Preload for the reverse proxy: drops the forwarding trace (X-Forwarded-For /
# X-Real-Ip / Forwarded) that Traefik and Cloudflare add, because dshmarket's
# privileged routes read a forwarding trace as "this loopback peer is a proxy,
# not the user" and answer 403. See the file's header for the full reasoning.
COPY strip-forwarded.cjs /app/harness/strip-forwarded.cjs

# DSH_HOME moves off /root; runtime state and logs live there.
# /app stays root-owned and is not written to at runtime.
#
# The XDG / npm / agents locations are redirected under $DSH_HOME so they land on
# the dsh-data volume: without this, pnpm's store and ~/.agents sit in the
# container layer and every `docker compose up --force-recreate` re-downloads
# them (the profile install is ~250 MB). pnpm reads the lowercase
# `npm_config_*` spelling from the environment, so that name is used verbatim.
#
# NOTE: the image still ends on user root by design -- the chown of the volumes
# needs it. The entrypoint drops to $DSH_RUN_AS before DSH ever starts.
ENV DSH_HOME=/home/node/.dsh \
	HOME=/home/node \
	DSH_WORKSPACE_ROOT=/workspace \
	DSH_AGENTS_HOME=/home/node/.dsh/.agents \
	XDG_CONFIG_HOME=/home/node/.dsh/.config \
	XDG_CACHE_HOME=/home/node/.dsh/.cache \
	XDG_DATA_HOME=/home/node/.dsh/.local/share \
	npm_config_cache=/home/node/.dsh/.npm \
	DSH_RUN_AS=node \
	PROXY_PORT=3080

# Base workspace. The entrypoint cds here before launching dsh web.
WORKDIR /workspace

EXPOSE 3080

ENTRYPOINT ["/app/entrypoint.sh"]
