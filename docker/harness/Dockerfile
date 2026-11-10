ARG BASE_IMAGE=smanx/deepseek-harness:devtools-min-0.2.2-rc.1
FROM ${BASE_IMAGE}

LABEL org.opencontainers.image.description="smanx/deepseek-harness devtools-min, non-root, workspace /workspace, sandbox auto-detect"
LABEL org.opencontainers.image.source="https://github.com/smanx/deepseek-harness-docker"

USER root

# Install necessary
RUN set -eux; \
	apt-get update; \
	apt-get install -y --no-install-recommends ca-certificates curl wget; \
	install -d -m 0755 /etc/apt/keyrings; \
	# GitHub CLI repo
	wget -qO /etc/apt/keyrings/githubcli-archive-keyring.gpg \
	https://cli.github.com/packages/githubcli-archive-keyring.gpg; \
	chmod 0644 /etc/apt/keyrings/githubcli-archive-keyring.gpg; \
	printf 'deb [arch=%s signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main\n' \
	"$(dpkg --print-architecture)" > /etc/apt/sources.list.d/github-cli.list; \
	# Cloudflared repo
	curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
	-o /etc/apt/keyrings/cloudflare-main.gpg; \
	chmod 0644 /etc/apt/keyrings/cloudflare-main.gpg; \
	echo "deb [signed-by=/etc/apt/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
	> /etc/apt/sources.list.d/cloudflared.list; \
	# Install target packages
	apt-get update; \
	apt-get install -y --no-install-recommends \
	bubblewrap cloudflared gh libatomic1 python3 rsync ripgrep build-essential procps \
	tree; \
	rm -rf /var/lib/apt/lists/*

# Workspace plus an unprivileged state dir. Both are chowned so the drop-privileges
# step can hand them to "node" without touching the rest of the image.
RUN mkdir -p /workspace /home/node/.dsh \
	&& chown -R node:node /workspace /home/node/.dsh

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod 0755 /app/entrypoint.sh

# Preload for the reverse proxy
COPY strip-forwarded.cjs /app/harness/strip-forwarded.cjs

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

WORKDIR /workspace

EXPOSE 3080

ENTRYPOINT ["/app/entrypoint.sh"]
