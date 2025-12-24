# vxid.cc

> the tools you keep forgetting to bookmark

A collection of useful tools. Starting with dead drop - quick file sharing with 6-digit codes.

## Features

- **Dead Drop**: Upload files, get a 6-digit code, share with anyone
  - Password protection
  - Custom expiry (10m to 7d)
  - Download limits
  - QR code for easy sharing
- **Dark/Light mode** with system preference detection

## Quick Start

```bash
npm install && npm run dev
```

## Environment

Copy `env.example.txt` to `.env.local` and configure:
- `R2_*` variables for Cloudflare R2 storage

## Stack

Next.js 15 • React 19 • Tailwind v4 • Framer Motion • shadcn/ui • Cloudflare R2

## License

MIT
