# Cloudflare Edge Error & Challenge Suite

A developer-grade, zero-overhead custom error and challenge suite engineered for Cloudflare Edge and ItsRose Network.

## Features

- **Cloudflare Edge Token Preservation**: Formatted to ensure edge string replacement tokens (`::RAY_ID::`, `::CLIENT_IP::`, `::GEO::`, `::CAPTCHA_BOX::`, `::CLOUDFLARE_ERROR_500S_BOX::`, `::CLOUDFLARE_ERROR_1000S_BOX::`) remain verbatim and unescaped.
- **Zero External Dependencies**: Self-contained SVG icons and system typography. No external Google Fonts, CDN scripts, or third-party assets that can fail during origin downtime or hostile attacks.
- **100% Inlined Stylesheets**: Compiled with `build: { inlineStylesheets: 'always' }` so that all critical CSS is inlined within `<style>` tags in the HTML payload.
- **Modern Obsidian & Zinc Dark Theme**: Sleek dark aesthetic with status tokens (`danger`, `warning`, `info`, `success`), micro-animations, glowing status indicators, and responsive diagnostic grids.
- **1-Click Diagnostics Copy**: Vanilla clipboard utility copying Ray ID, Client IP, Colo, and timestamp with visual confirmation.
- **Interactive 3-Hop Visual Diagram**: Visualizes `Browser -> Cloudflare Edge -> Origin Host` connection status with dedicated error/blocked states.
- **Local Dev Preview Hub**: An interactive dashboard at `/` with injected mock tokens for visual verification without needing an actual outage.

---

## File Structure

```
apps/waf-page
├── astro.config.mjs
├── package.json
├── README.md
├── src
│   ├── components/
│   │   ├── DiagnosticsBox.astro       # Ray ID, Client IP, Colo/Geo, and 1-click copy
│   │   ├── ErrorHeader.astro          # Status badge, error title, and clear description
│   │   ├── LoadingSpinner.astro       # Minimal SVG challenge loader
│   │   └── NetworkHopDiagram.astro    # Clean 3-hop visual: Browser -> Cloudflare Edge -> Origin Host
│   ├── layouts/
│   │   ├── ErrorLayout.astro          # Shared lightweight base layout (inlined CSS, meta robots noindex)
│   │   └── SiteFooter.astro           # Minimal brand footer and status indicator
│   ├── pages/
│   │   ├── index.astro                # Local dev dashboard listing all preview templates with mock tokens
│   │   ├── 500.astro                  # Origin host failure (500-series)
│   │   ├── 1000.astro                 # DNS / Tunnel connection failure (1000-series)
│   │   ├── waf-block.astro            # WAF firewall rule block (1020)
│   │   ├── country-block.astro        # Geo-restriction firewall block
│   │   ├── rate-limiting.astro        # 429 rate limit exceeded
│   │   ├── interactive-challenge.astro     # Turnstile / Managed CAPTCHA
│   │   ├── manage-challenge.astro          # Managed challenge verification
│   │   └── non-interactive-challenge.astro # JavaScript background verification
│   └── styles/
│       └── global.css                 # Clean CSS variables, typography, and utility classes
└── tsconfig.json
```

---

## Edge Tokens Reference

| Token                            | Target Template                                                                            | Description                                     |
| :------------------------------- | :----------------------------------------------------------------------------------------- | :---------------------------------------------- |
| `::CLOUDFLARE_ERROR_500S_BOX::`  | `500.astro`                                                                                | Cloudflare origin error diagnostics box         |
| `::CLOUDFLARE_ERROR_1000S_BOX::` | `1000.astro`                                                                               | Cloudflare DNS / connection failure box         |
| `::CAPTCHA_BOX::`                | `interactive-challenge.astro`, `manage-challenge.astro`, `non-interactive-challenge.astro` | Cloudflare Turnstile / Managed challenge widget |
| `::RAY_ID::`                     | All error & challenge templates                                                            | Unique Cloudflare request identifier            |
| `::CLIENT_IP::`                  | All error & challenge templates                                                            | Public visitor IP address                       |
| `::GEO::`                        | All error & challenge templates                                                            | Edge data center / airport IATA code            |

---

## Local Development & Preview

Start the local development server:

```bash
pnpm --filter waf-page dev
```

Navigate to `http://localhost:4321` to view the **Development Hub**, featuring:

- Gallery of all error & challenge pages
- Injected mock tokens (`8f7e2a91c0b3`, `203.0.113.195`, `CGK / Jakarta`)
- Direct links to preview each edge scenario

### Direct URLs:

- `/500` &mdash; 500 Origin Host Failure
- `/1000` &mdash; 1000 DNS / Tunnel Connection Error
- `/waf-block` &mdash; WAF Rule Firewall Block
- `/country-block` &mdash; Regional Geoblock
- `/rate-limiting` &mdash; 429 Too Many Requests
- `/interactive-challenge` &mdash; Turnstile Interactive Challenge
- `/manage-challenge` &mdash; Managed Challenge Verification
- `/non-interactive-challenge` &mdash; Silent JS Background Verification

---

## Production Build & Verification

Compile static outputs with inlined stylesheets:

```bash
pnpm --filter waf-page build
```

Preview the production build locally:

```bash
pnpm --filter waf-page preview
```
