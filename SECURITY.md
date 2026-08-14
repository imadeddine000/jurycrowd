# Security

## Authentication

JuryCrowd uses a simple admin password authentication system:

- On first run, you'll be prompted to set an admin password
- The password is hashed (SHA-256) and stored in `~/.jurycrowd/config.json`
- All API requests require a Bearer token (the password hash) in the `Authorization` header
- WebSocket connections require the token as a `?token=` query parameter
- Without a valid token, no API or WebSocket access is possible

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
