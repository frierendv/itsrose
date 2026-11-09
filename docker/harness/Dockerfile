# Private custom image: layered on the published image, nothing rebuilt or patched.
#
#   BASE: smanx/deepseek-harness:devtools-min-latest
#
# Changes over the upstream image:
#   1. Runs as the unprivileged "node" user (uid 1000) instead of root, so files
#      written into a bind-mounted workspace are owned by that uid on the host
#      instead of root:root. A short root phase in the entrypoint repairs volume
#      ownership, then re-executes itself via setpriv.
#   2. Base workspace is /workspace: DSH has no --cwd flag, so the session workspace
#      defaults to the process cwd; the entrypoint cds there before starting dsh web.
#   3. Installs bubblewrap and probes it at startup; when no confinement backend is
#      usable (e.g. CentOS 7 / kernel 3.10) it falls back to danger-full-access
#      instead of failing closed with SANDBOX_UNAVAILABLE.
#
# Usage:
#   docker build -t <your-registry>/deepseek-harness:nonroot .
#
#   docker run -d --name dsh-harness \
#     -p 127.0.0.1:80:3080 \
#     -v dsh-data:/home/node/.dsh \
#     -v /home/you/project:/workspace \
#     <your-registry>/deepseek-harness:nonroot
#
# NOTE: the state volume path changed from /root/.dsh to /home/node/.dsh.
# Reusing an old /root/.dsh mount here would be ignored and DSH would rebuild its
# profile inside the container layer (about 250 MB).

ARG BASE_IMAGE=smanx/deepseek-harness:devtools-min-latest
FROM ${BASE_IMAGE}

LABEL org.opencontainers.image.description="smanx/deepseek-harness devtools-min, non-root, workspace /workspace, sandbox auto-detect"
LABEL org.opencontainers.image.source="https://github.com/smanx/deepseek-harness-docker"

USER root

# bubblewrap: one of the backends workspace-write can use. Without a backend the
# entrypoint degrades to danger-full-access instead of leaving the agent unusable.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends bubblewrap rsync \
	&& rm -rf /var/lib/apt/lists/*

# Workspace plus an unprivileged state dir. Both are chowned so the drop-privileges
# step can hand them to "node" without touching the rest of the image.
RUN mkdir -p /workspace /home/node/.dsh \
	&& chown -R node:node /workspace /home/node/.dsh

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod 0755 /app/entrypoint.sh

# DSH_HOME moves off /root; runtime state and logs live there.
# /app stays root-owned and is not written to at runtime.
ENV DSH_HOME=/home/node/.dsh \
	HOME=/home/node \
	DSH_WORKSPACE_ROOT=/workspace \
	DSH_RUN_AS=node \
	PROXY_PORT=3080

# Base workspace. The entrypoint cds here before launching dsh web.
WORKDIR /workspace

EXPOSE 3080

ENTRYPOINT ["/app/entrypoint.sh"]
