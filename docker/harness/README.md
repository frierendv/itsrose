# DeepSeek Harness Docker

Custom Docker deployment for DeepSeek Harness (`@deepseek-ai/dsh`) designed to run behind a Cloudflare Zero Trust tunnel (`harness.example.com` -> `http://localhost:8080`) with bind-mounted `/workspace` and automated tokenless access while preventing **CVE-2026-82533**.

## Features

- **Bind-mounted `/workspace`**: Maps host files directly to `/workspace` running as non-root `node:node` (UID/GID 1000).
- **Cloudflare Zero Trust Seamless Auth**: Automatically exchanges the DSH process launch token for a signed 30-day session cookie on the initial handshake via Caddy, eliminating manual token entry.
- **CVE-2026-82533 Protection**:
    - DSH binds to internal loopback (`127.0.0.1:3080`).
    - Caddy auto-auth rewrite is restricted to external Cloudflare requests (`header Cf-Ray *`) and explicitly excludes loopback (`not client_ip 127.0.0.1 ::1`).
    - Direct API requests (`/api/...`) from inside the container without a session cookie are rejected with `401 Unauthorized`.
    - Caddy admin API (`localhost:2019`) and persistent autosave are disabled.
    - Process launch token is redacted in logs after acquisition.
- **Toolchain & Plugins**: Bundles `bwrap`, `gh`, `cloudflared`, `gitleaks`, `shfmt`, `dockerfmt`, `shellcheck`, and 7 pre-installed plugins (`dshmarket`, `dsh-better-sidebar`, `dsh-context`, `dsh-tool-antigravity`, `@michengai/dsh-skills-manager`, `dsh-mcp-connector`, `dsh-plugin-wallpaper-engine`).

## Running with Docker Compose (Recommended)

1. Create your environment configuration:

    ```bash
    cp .env.example .env
    ```

2. Start the container in the background:

    ```bash
    docker compose up -d
    ```

3. Check logs:

    ```bash
    docker compose logs -f
    ```

4. Stop the container:
    ```bash
    docker compose down
    ```

## Running directly with Docker CLI

```bash
docker run -d \
  --name dsh-harness \
  -p 127.0.0.1:8080:8080 \
  -v $(pwd)/workspace:/workspace \
  -v dsh-home:/home/node/.dsh \
  -e DSH_TRUSTED_HOST=harness.example.com \
  --restart unless-stopped \
  dsh-custom:dev
```

## Tunnel Routing

- **Hostname**: `harness.example.com` (sub/domain)
- **Service**: `http://localhost:8080` (cloudflared tunnel forwarding to container port 8080)
