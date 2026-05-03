# Reverie — Project Specification

## Overview

Reverie is a **local content management tool** (not a public-facing blog). It runs as a local server, opens an admin UI in the browser, and provides a powerful MDX editor with AI-assisted writing and component development.

Content is stored as **MDX files + React component files** directly on disk, making it compatible with any static site generator (Astro, Next.js, etc.).

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **UI**: shadcn/ui + Tailwind CSS 4
- **Rich Editor**: Tiptap (prosemirror-based, supports MDX, extensible)
- **Backend**: Hono (lightweight Node.js server)
- **Package Manager**: pnpm
- **Content Storage**: Local filesystem (MDX + React/TSX files)

## Architecture

```
~/Developer/reverie/
├── src/
│   ├── client/          # React SPA (admin UI)
│   │   ├── components/
│   │   │   ├── editor/      # Tiptap MDX editor
│   │   │   ├── ai-panel/    # AI chat sidebar
│   │   │   ├── preview/     # Component live preview
│   │   │   └── ui/          # shadcn/ui components
│   │   ├── pages/
│   │   │   ├── index.tsx        # Dashboard / file browser
│   │   │   └── editor/[slug].tsx # Editor page
│   │   ├── lib/
│   │   │   ├── ai.ts        # AI provider abstraction
│   │   │   └── api.ts       # Backend API client
│   │   └── App.tsx
│   └── server/          # Hono backend
│       ├── index.ts      # Server entry
│       ├── routes/
│       │   ├── files.ts      # CRUD for MDX/component files
│       │   ├── ai.ts         # AI proxy endpoints
│       │   └── preview.ts    # Component preview rendering
│       └── lib/
│           ├── ai-providers.ts   # LLM provider implementations
│           └── hermes.ts         # Hermes Agent gateway integration
├── content/             # User content (MDX + components)
│   ├── posts/           # Blog posts as .mdx
│   └── components/      # Custom React components as .tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

## Core Features

### 1. File Browser / Dashboard
- List all MDX posts and component files in `content/`
- Create, rename, delete, move files
- Show frontmatter (title, date, tags, status)
- Search/filter by metadata

### 2. MDX Rich Editor (Tiptap)
- Full MDX support: markdown + JSX components inline
- Toolbar: headings, bold, italic, links, code blocks, lists, images
- **Live preview** panel showing rendered MDX output
- Frontmatter editor (YAML at the top of MDX files)
- Syntax highlighting for embedded JSX/code
- Image upload support (drag & drop, copy-paste)

### 3. AI Chat Panel (Side Panel)
- Collapsible sidebar for conversational AI interaction
- Chat history per session
- Can reference the current document content
- Context-aware: AI knows what file you're editing
- Use cases: brainstorming, outlining, drafting sections, asking questions

### 4. AI Inline Actions (Selection-based)
- Select text → right-click or keyboard shortcut → AI actions:
  - Continue writing
  - Rewrite / improve
  - Translate (to English/Chinese)
  - Summarize
  - Fix grammar
  - Change tone
- Inline diff preview before accepting changes

### 5. AI Providers
- **Direct LLM API**: Support OpenAI, Anthropic, Zhipu/GLM, Google Gemini
  - User configures API keys in settings page
  - Streaming responses for real-time output
- **Hermes Agent Integration**: Connect to Hermes Agent gateway
  - Uses Hermes's memory (conversation history, user preferences)
  - Can leverage Hermes skills
  - Needs Hermes gateway URL + auth token configuration

### 6. Component Editor
- Dedicated editor/view for React/Astro components (.tsx files)
- Live preview of component rendering
- AI-assisted component generation ("Create a code highlight card component")
- Generated components can be imported in MDX files
- Props editor / documentation panel

### 7. Settings Page
- AI provider configuration (API keys, model selection, base URLs)
- Hermes Agent connection settings (gateway URL, auth)
- Editor preferences (theme, font size, keybindings)
- Content directory path configuration

## Backend API Design

```
# Files
GET    /api/files              # List all content files
GET    /api/files/:path        # Read file content
POST   /api/files              # Create new file
PUT    /api/files/:path        # Update file content
DELETE /api/files/:path        # Delete file

# AI - Direct LLM
POST   /api/ai/chat            # Streaming chat (SSE)
POST   /api/ai/complete        # Text completion/inline action
GET    /api/ai/providers       # List configured providers

# AI - Hermes Agent
POST   /api/hermes/chat        # Proxy to Hermes gateway (SSE)

# Preview
POST   /api/preview            # Render MDX/TSX for live preview
```

## Implementation Priority

1. **Phase 1 — Foundation**: Project setup (Vite + React + Hono + Tailwind + shadcn/ui), file browser, basic MDX editor, file CRUD API
2. **Phase 2 — AI Integration**: Direct LLM providers, chat panel, inline AI actions
3. **Phase 3 — Hermes Agent**: Hermes gateway integration, memory-aware conversations
4. **Phase 4 — Component Editor**: Component file editor, live preview, AI component generation
5. **Phase 5 — Polish**: Settings page, image upload, keyboard shortcuts, error handling

## Notes

- This is a **local development tool**, not deployed anywhere
- The server should be lightweight — start with `pnpm dev`, stop when done
- No authentication needed (local only)
- No database — all content is files on disk
- Keep dependencies minimal
- The MDX editor is the heart of the app — invest time in getting it right
