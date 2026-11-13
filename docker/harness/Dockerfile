# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:24-trixie-slim
ARG DSH_VERSION=0.2.2-rc.2
ARG PNPM_VERSION=11.20.0
ARG GH_VERSION=2.103.3
ARG GITLEAKS_VERSION=8.30.1
ARG SHFMT_VERSION=3.14.1
ARG DOCKERFMT_VERSION=0.6.0
ARG SHELLCHECK_VERSION=0.11.0
ARG CADDY_VERSION=2.8.4

# ==============================================================================
# Stage 1: tools-downloader
# Download and extract all CLI tools & Caddy into /usr/local/bin
# ==============================================================================
FROM ${NODE_IMAGE} AS tools-downloader

ARG GH_VERSION
ARG GITLEAKS_VERSION
ARG SHFMT_VERSION
ARG DOCKERFMT_VERSION
ARG SHELLCHECK_VERSION
ARG CADDY_VERSION

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

RUN set -eu; \
    ARCH="$(dpkg --print-architecture)"; \
    case "${ARCH}" in \
        amd64) GITLEAKS_ARCH="x64";   SHELLCHECK_ARCH="x86_64" ;; \
        arm64) GITLEAKS_ARCH="arm64"; SHELLCHECK_ARCH="aarch64" ;; \
        *) echo "Unsupported architecture: ${ARCH}" >&2; exit 1 ;; \
    esac; \
    # GitHub CLI \
    curl -fsSL "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_${ARCH}.tar.gz" \
        | tar -xz --strip-components=2 -C /usr/local/bin "gh_${GH_VERSION}_linux_${ARCH}/bin/gh"; \
    # Cloudflared \
    curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}" \
        -o /usr/local/bin/cloudflared; \
    # Gitleaks \
    curl -fsSL "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_${GITLEAKS_ARCH}.tar.gz" \
        | tar -xz -C /usr/local/bin gitleaks; \
    # shfmt \
    curl -fsSL "https://github.com/mvdan/sh/releases/download/v${SHFMT_VERSION}/shfmt_v${SHFMT_VERSION}_linux_${ARCH}" \
        -o /usr/local/bin/shfmt; \
    # dockerfmt \
    curl -fsSL "https://github.com/reteps/dockerfmt/releases/download/v${DOCKERFMT_VERSION}/dockerfmt-v${DOCKERFMT_VERSION}-linux-${ARCH}.tar.gz" \
        | tar -xz -C /usr/local/bin dockerfmt; \
    # ShellCheck \
    curl -fsSL "https://github.com/koalaman/shellcheck/releases/download/v${SHELLCHECK_VERSION}/shellcheck-v${SHELLCHECK_VERSION}.linux.${SHELLCHECK_ARCH}.tar.gz" \
        | tar -xz --strip-components=1 -C /usr/local/bin "shellcheck-v${SHELLCHECK_VERSION}/shellcheck"; \
    # Caddy v2.8.4 \
    curl -fsSL "https://github.com/caddyserver/caddy/releases/download/v${CADDY_VERSION}/caddy_${CADDY_VERSION}_linux_${ARCH}.tar.gz" \
        | tar -xz -C /usr/local/bin caddy; \
    # Permissions \
    chmod 0755 /usr/local/bin/gh /usr/local/bin/cloudflared /usr/local/bin/gitleaks /usr/local/bin/shfmt /usr/local/bin/dockerfmt /usr/local/bin/shellcheck /usr/local/bin/caddy; \
    # Verify installations \
    test "$(gh --version | head -n 1 | awk '{print $3}')" = "${GH_VERSION}"; \
    cloudflared --version >/dev/null; \
    test "$(gitleaks version)" = "${GITLEAKS_VERSION}"; \
    test "$(shfmt --version)" = "v${SHFMT_VERSION}"; \
    test "$(dockerfmt version)" = "dockerfmt v${DOCKERFMT_VERSION}"; \
    test "$(shellcheck --version | grep 'version:' | awk '{print $2}')" = "${SHELLCHECK_VERSION}"; \
    test "$(caddy version | awk '{print $1}')" = "v${CADDY_VERSION}"

# ==============================================================================
# Stage 2: dsh-builder
# Install build-essential, compile native modules cleanly, install DSH + pnpm,
# pre-install plugins, deduplicate, and prune caches
# ==============================================================================
FROM ${NODE_IMAGE} AS dsh-builder

ARG DSH_VERSION
ARG PNPM_VERSION

ENV HOME=/home/node \
    DSH_HOME=/home/node/.dsh \
    DSH_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_CACHE=/home/node/.dsh/.npm-cache \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    PNPM_CONFIG_UPDATE_NOTIFIER=false \
    PNPM_HOME=/home/node/.dsh/.local/share/pnpm \
    PNPM_STORE_DIR=/home/node/.dsh/.local/share/pnpm/store \
    XDG_CACHE_HOME=/home/node/.dsh/.cache \
    PATH=/usr/local/bin:${PATH}

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        ca-certificates \
        curl \
        git \
        python3 \
        build-essential \
        libatomic1 \
    && npm install --global --omit=dev --no-audit --no-fund \
        --allow-scripts=@deepseek-ai/dsh-subprocess-local,koffi,node-pty,@google/genai,protobufjs \
        "@deepseek-ai/dsh@${DSH_VERSION}" \
        "pnpm@${PNPM_VERSION}" \
    && (cd /usr/local/lib/node_modules/@deepseek-ai/dsh && npm dedupe --omit=dev) \
    && npm cache clean --force \
    && test "$(dsh --version)" = "${DSH_VERSION}" \
    && test "$(pnpm --version)" = "${PNPM_VERSION}"

RUN mkdir -p "$DSH_HOME" \
    && chown -R node:node "${DSH_HOME}"

USER node
RUN dsh plugin --profile web add \
    dshmarket \
    dsh-better-sidebar \
    dsh-context \
    dsh-tool-antigravity \
    @michengai/dsh-skills-manager \
    dsh-mcp-connector \
    dsh-plugin-wallpaper-engine

# Skills preset
RUN mkdir -p "$DSH_HOME/skills" \
    && mkdir -p "$DSH_HOME/skills/gh"
RUN curl -fsSL "https://raw.githubusercontent.com/cli/cli/refs/heads/trunk/skills/gh/SKILL.md" \
    -o "$DSH_HOME/skills/gh/SKILL.md"

# ==============================================================================
# Stage 3: runtime
# Lean final image with runtime packages, CLI tools, DSH binaries & profiles
# ==============================================================================
FROM ${NODE_IMAGE} AS runtime

WORKDIR /opt/deepseek-harness

ARG DSH_VERSION
ARG PNPM_VERSION
ARG GH_VERSION
ARG GITLEAKS_VERSION
ARG SHFMT_VERSION
ARG DOCKERFMT_VERSION
ARG SHELLCHECK_VERSION
ARG CADDY_VERSION

# Install runtime dependencies only (no build-essential / compilers)
RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        ca-certificates \
        curl \
        git \
        procps \
        python3 \
        bubblewrap \
        libatomic1 \
        rsync \
        ripgrep \
        jq \
        less \
        openssh-client \
        tini \
        wget \
    && command -v bwrap >/dev/null \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/* /usr/share/man /usr/share/doc

# Copy CLI tools & Caddy from tools-downloader
COPY --from=tools-downloader \
    /usr/local/bin/gh /usr/local/bin/cloudflared /usr/local/bin/gitleaks /usr/local/bin/shfmt /usr/local/bin/dockerfmt /usr/local/bin/shellcheck /usr/local/bin/caddy /usr/local/bin/

# Copy entrypoint script
COPY --chmod=0755 entrypoint.sh /usr/local/bin/entrypoint.sh

# Copy global node modules from dsh-builder
COPY --from=dsh-builder /usr/local/lib/node_modules/@deepseek-ai /usr/local/lib/node_modules/@deepseek-ai
COPY --from=dsh-builder /usr/local/lib/node_modules/pnpm /usr/local/lib/node_modules/pnpm

# Create global CLI symlinks
RUN ln -s ../lib/node_modules/@deepseek-ai/dsh/lib/bin.js /usr/local/bin/dsh \
    && ln -s ../lib/node_modules/pnpm/bin/pnpm.mjs /usr/local/bin/pnpm \
    && ln -s ../lib/node_modules/pnpm/bin/pnpx.mjs /usr/local/bin/pnpx

# Runtime environment configuration:
# HOME: Explicitly declared non-root user home directory
# DSH_HOME: DSH data directory containing profiles, configuration, and plugins
# DSH_WORKSPACE: Working directory for DSH projects
# GATEWAY_PORT: Public port for Caddy reverse proxy
# DSH_INTERNAL_PORT: Loopback port for DSH web server (127.0.0.1:3080)
# DSH_TELEMETRY_DISABLED: Disables telemetry reporting
# NPM_CONFIG_* / PNPM_CONFIG_* / PNPM_* / XDG_CACHE_HOME: Direct package manager caches and stores into DSH_HOME and disable update checks
# PATH: Ensures /usr/local/bin and pnpm binaries are accessible
ENV HOME=/home/node \
    DSH_HOME=/home/node/.dsh \
    DSH_WORKSPACE=/workspace \
    GATEWAY_PORT=8080 \
    DSH_INTERNAL_PORT=3080 \
    DSH_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_CACHE=/home/node/.dsh/.npm-cache \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    PNPM_CONFIG_UPDATE_NOTIFIER=false \
    PNPM_HOME=/home/node/.dsh/.local/share/pnpm \
    PNPM_STORE_DIR=/home/node/.dsh/.local/share/pnpm/store \
    XDG_CACHE_HOME=/home/node/.dsh/.cache \
    PATH=/usr/local/bin:/home/node/.dsh/.local/share/pnpm:${PATH}

# Create runtime directory structure and configure permissions
RUN mkdir -p /etc/caddy /workspace \
    /home/node/.local/share/caddy /home/node/.config/caddy \
    && chown -R node:node /workspace /home/node /opt/deepseek-harness

# Copy Caddyfile
COPY config/Caddyfile /etc/caddy/Caddyfile
# Copy dsh-plugin-wallpaper-engine preset
COPY --chown=node:node config/dsh-wallpaper-engine "${HOME}/.dsh-wallpaper-engine"

# Copy pre-configured DSH home directory (.dsh with profiles and presets)
# Named volume 'dsh-home' will be seeded from /home/node/.dsh on first container startup
COPY --from=dsh-builder --chown=node:node /home/node/.dsh /home/node/.dsh

# Verify installations
RUN test "$(dsh --version)" = "${DSH_VERSION}" \
    && test "$(pnpm --version)" = "${PNPM_VERSION}" \
    && test "$(gh --version | head -n 1 | awk '{print $3}')" = "${GH_VERSION}" \
    && cloudflared --version >/dev/null \
    && test "$(gitleaks version)" = "${GITLEAKS_VERSION}" \
    && test "$(shfmt --version)" = "v${SHFMT_VERSION}" \
    && test "$(dockerfmt version)" = "dockerfmt v${DOCKERFMT_VERSION}" \
    && test "$(shellcheck --version | grep 'version:' | awk '{print $2}')" = "${SHELLCHECK_VERSION}" \
    && test "$(caddy version | awk '{print $1}')" = "v${CADDY_VERSION}" \
    && rm -rf /root/.local /root/.cache

USER node

WORKDIR /workspace

EXPOSE 8080
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
