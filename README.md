# vxid.cc

A privacy-first toolkit with 13 essential utilities — all running client-side in your browser. No sign-ups, no tracking, just useful tools. Developed as a personal project to provide quick access to commonly needed web utilities.

## Overview

vxid.cc provides users with instant access to commonly needed tools without the friction of sign-ups or advertisements. The application handles file sharing, text manipulation, image processing, and code generation while keeping all operations client-side for maximum privacy.

### Core Capabilities

- **Dead Drop file sharing** with 6-digit codes, password protection, and auto-expiry
- **Client-side image processing** including format conversion and AI background removal
- **Text utilities** for cleaning, case conversion, word counting, and hashing
- **Generator tools** for passwords, QR codes, favicons, and color palettes

## Architecture

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 15 (App Router) | Server/client React components with TypeScript |
| Backend | Cloudflare R2 | Object storage for dead drop file sharing |
| Styling | Tailwind CSS v4 | Utility-first CSS framework |
| Components | shadcn/ui | Accessible, customizable UI primitives |
| Animations | Framer Motion | UI transitions and micro-interactions |
| Icons | Phosphor Icons | Consistent icon system |

### Key Design Decisions

1. **Client-side processing**: All tools except dead drop run entirely in the browser
2. **Dark mode first**: Designed for dark mode with optional light theme
3. **Mobile-first responsive**: Carousel navigation on mobile, inline arrows on desktop
4. **No native browser pickers**: Custom styled inputs for consistent theming

## Project Structure

```
├── app/
│   ├── page.tsx              # Landing page
│   ├── share/page.tsx        # Tools carousel
│   ├── download/page.tsx     # File download page
│   └── api/                  # Upload/download endpoints
├── components/
│   ├── tools/                # 13 tool components
│   │   ├── dead-drop.tsx     # File sharing with codes
│   │   ├── qr-gen.tsx        # QR code generator
│   │   ├── passgen.tsx       # Password generator
│   │   ├── color-picker.tsx  # Color converter
│   │   ├── hash-gen.tsx      # Text hashing
│   │   ├── text-cleaner.tsx  # Whitespace cleaner
│   │   ├── word-count.tsx    # Word/char counter
│   │   ├── date-diff.tsx     # Date calculator
│   │   ├── emoji-picker.tsx  # Emoji search
│   │   ├── case-converter.tsx # Case transformation
│   │   ├── image-converter.tsx # Format converter
│   │   ├── favicon-gen.tsx   # Favicon generator
│   │   └── bg-remover.tsx    # AI background removal
│   ├── tools-carousel.tsx    # Navigation and layout
│   └── ui/                   # shadcn components
└── lib/
    └── tools-config.ts       # Tool definitions and categories
```

## Prerequisites

- Node.js 18.18 or higher (Node 20 recommended)
- npm 9+ (or equivalent package manager)
- Cloudflare R2 account (only for dead drop feature)

## Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/ndycode/vxid.cc.git
cd vxid.cc
npm install
```

### 2. Environment Configuration

Copy `env.example.txt` to `.env.local`:

```env
# Cloudflare R2 (required only for dead drop)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
```

> **Note:** All tools except dead drop work without any configuration.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Deployment

### Vercel (Recommended)

1. Push repository to GitHub
2. Import project in Vercel dashboard
3. Configure environment variables
4. Deploy

### Manual Deployment

```bash
npm run build
npm run start
```

### Pre-deployment Checklist

- [ ] Environment variables configured
- [ ] R2 bucket created and accessible (if using dead drop)
- [ ] CORS configured on R2 bucket

## Security Considerations

- All file uploads are automatically deleted after download or expiry
- Passwords for file protection are hashed server-side
- No user data is stored or tracked
- All client-side processing stays in the browser

## Authors

- **ndycode** - [github.com/ndycode](https://github.com/ndycode)

## License

MIT — use it however you want.
