# Reverie — Task Brief for OpenCode

## Project Overview

Reverie is a **local content management tool** (not a public-facing blog). It runs as a local Node.js server, opens an admin UI in the browser, and provides a powerful MDX editor with AI-assisted writing and component development.

Content is stored as **MDX files + React component files** directly on disk (`content/` directory), making it compatible with any static site generator (Astro, Next.js, etc.).

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 19, TypeScript, Vite |
| UI Components | shadcn/ui + Tailwind CSS 4 |
| Rich Editor | Tiptap (ProseMirror-based, MDX support) |
| Backend | Hono (lightweight Node.js server) |
| Package Manager | pnpm (never npm/npx) |
| Content Storage | Local filesystem — MDX + TSX files |

## Confirmed Requirements

### 1. Content Storage
- Articles and components stored as MDX files and React/TSX files directly on local disk
- Directory structure: `content/posts/` for blog posts, `content/components/` for custom components
- No database — all content is files

### 2. Frontend Framework
- React 19 + TypeScript + Vite
- shadcn/ui + Tailwind CSS 4 for styling

### 3. AI Interaction — Two Modes

**A) Chat Panel (sidebar)**
- Collapsible sidebar for conversational AI interaction
- Chat history per session
- Can reference the current document content
- Context-aware: AI knows what file you're editing
- Use cases: brainstorming, outlining, drafting, Q&A

**B) Inline AI Actions (selection-based)**
- Select text → right-click or keyboard shortcut → AI actions:
  - Continue writing
  - Rewrite / improve
  - Translate (to English/Chinese)
  - Summarize
  - Fix grammar
  - Change tone
- Inline diff preview before accepting changes

### 4. AI Providers — Two Backends

**A) Direct LLM API**
- Support OpenAI, Anthropic, Zhipu/GLM, Google Gemini
- User configures API keys in settings page
- Streaming responses (SSE)

**B) Hermes Agent Integration**
- Connect to Hermes Agent gateway
- Leverages Hermes's memory (conversation history, user preferences, skills)
- Needs gateway URL + auth token configuration
- Provides context-aware responses that no bare LLM can match

### 5. Backend
- Hono (Node.js) — lightweight, not a long-running production server
- Main responsibilities: file I/O, AI API proxy, component preview rendering

### 6. Component Editor
- Dedicated editor for React/Astro component files (.tsx)
- Live preview of component rendering
- AI-assisted component generation (e.g. "Create a code highlight card component")
- Generated components can be imported in MDX files

### 7. UI Style
- shadcn/ui + Tailwind CSS 4

## Suggested Architecture

```
~/Developer/reverie/
├── src/
│   ├── client/                # React SPA (admin UI)
│   │   ├── components/
│   │   │   ├── editor/        # Tiptap MDX editor
│   │   │   ├── ai-panel/      # AI chat sidebar
│   │   │   ├── preview/       # Component live preview
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── pages/
│   │   │   ├── index.tsx      # Dashboard / file browser
│   │   │   └── editor/[slug].tsx  # Editor page
│   │   ├── lib/
│   │   │   ├── ai.ts          # AI provider abstraction
│   │   │   └── api.ts         # Backend API client
│   │   └── App.tsx
│   └── server/                # Hono backend
│       ├── index.ts
│       ├── routes/
│       │   ├── files.ts       # CRUD for MDX/component files
│       │   ├── ai.ts          # AI proxy endpoints (SSE streaming)
│       │   └── preview.ts     # Component preview rendering
│       └── lib/
│           ├── ai-providers.ts   # LLM provider implementations
│           └── hermes.ts         # Hermes Agent gateway integration
├── content/                   # User content
│   ├── posts/                 # Blog posts as .mdx
│   └── components/            # Custom React components as .tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

## Backend API Design

```
# Files
GET    /api/files              # List all content files
GET    /api/files/:path        # Read file content
POST   /api/files              # Create new file
PUT    /api/files/:path        # Update file content
DELETE /api/files/:path        # Delete file

# AI — Direct LLM
POST   /api/ai/chat            # Streaming chat (SSE)
POST   /api/ai/complete        # Text completion / inline action
GET    /api/ai/providers       # List configured providers

# AI — Hermes Agent
POST   /api/hermes/chat        # Proxy to Hermes gateway (SSE)

# Preview
POST   /api/preview            # Render MDX/TSX for live preview
```

## Implementation Phases

### Phase 1 — Foundation (do this first)
1. Initialize project: Vite + React 19 + TypeScript + pnpm
2. Set up Tailwind CSS 4 and shadcn/ui
3. Set up Hono backend — Vite dev server proxies `/api/*` to Hono
4. File browser / dashboard page listing files in `content/`
5. Basic MDX editor with Tiptap (headings, bold, italic, links, code blocks, lists, images, frontmatter)
6. Backend API routes for file CRUD
7. Sample content in `content/posts/` and `content/components/`
8. `pnpm dev` starts both Vite frontend and Hono backend

### Phase 2 — AI Integration
1. Direct LLM providers (OpenAI, Anthropic, GLM, Gemini) with streaming
2. Chat panel (sidebar)
3. Inline AI actions (selection-based)

### Phase 3 — Hermes Agent
1. Hermes gateway integration
2. Memory-aware conversations

### Phase 4 — Component Editor
1. Component file editor
2. Live preview
3. AI component generation

### Phase 5 — Polish
1. Settings page (API keys, Hermes config, editor preferences)
2. Image upload (drag & drop, paste)
3. Keyboard shortcuts
4. Error handling

## Notes

- This is a **local development tool**, not deployed anywhere
- The server should be lightweight — `pnpm dev` to start, stop when done
- No authentication needed (local only)
- No database — all content is files on disk
- Keep dependencies minimal
- The MDX editor is the heart of the app — invest in getting it right
- Use `pnpm`, never `npm` or `npx`
