# Security

## Authentication

JuryCrowd uses a secure cookie-based admin password authentication system:

- On first run, you'll be prompted to set an admin password
- The password is hashed (SHA-256) and stored in `~/.jurycrowd/config.json`
- On login, the server sets an **HttpOnly** cookie (`jurycrowd_auth`) containing the hash
- All API requests are authenticated via this cookie (sent automatically by the browser)
- WebSocket connections validate the same cookie from the upgrade request headers
- The cookie is `SameSite=Lax` (CSRF protection) and `Secure` in production (HTTPS only)
- **No token is ever stored in localStorage** — this prevents XSS token theft
- The cookie expires after 7 days
- Logout clears the cookie via `POST /api/auth/logout`

## Important: Local-First Application

JuryCrowd is designed as a **local-first** application. It assumes a trusted network environment.

### Exposing to the Internet

**Do not expose JuryCrowd directly to the internet.** If you need remote access, use a reverse proxy or tunnel:

- **[Tailscale](https://tailscale.com/)** — Zero-config VPN, easiest option
- **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)** — Expose locally without opening ports
- **[NGINX reverse proxy](https://nginx.org/)** — Add TLS termination and additional auth

### Why Direct Exposure is Dangerous

- The admin password is a single shared credential (no rate limiting by default)
- Terminal sessions give shell access to the host machine
- File routes can read/write files within workspace directories
- There is no HTTPS/TLS by default (use a reverse proxy for this)

## Reporting Vulnerabilities

If you discover a security vulnerability, please email **security@jurycrowd.com** instead of opening a public issue.
