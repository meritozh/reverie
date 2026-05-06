import path from "node:path"
import fs from "node:fs/promises"
import matter from "gray-matter"

export const CONTENT_ROOT = path.resolve(process.cwd(), "content")

export function sanitizePath(relativePath: string): string {
  const resolved = path.normalize(relativePath)
  if (resolved.startsWith("..") || path.isAbsolute(resolved)) {
    throw new Error("Invalid path: directory traversal detected")
  }
  return resolved
}

export interface ContentFileEntry {
  name: string
  path: string
  type: "mdx" | "tsx" | "directory"
  size: number
  modified: string
}

export async function listContentFiles(root: string): Promise<ContentFileEntry[]> {
  const entries: ContentFileEntry[] = []

  async function walk(dir: string, relBase: string): Promise<void> {
    const items = await fs.readdir(dir, { withFileTypes: true })
    for (const item of items) {
      const rel = relBase ? `${relBase}/${item.name}` : item.name
      if (item.isDirectory()) {
        entries.push({
          name: item.name,
          path: rel,
          type: "directory",
          size: 0,
          modified: "",
        })
        await walk(path.join(dir, item.name), rel)
      } else if (item.isFile()) {
        const ext = path.extname(item.name)
        if (ext !== ".mdx" && ext !== ".tsx") continue
        const stat = await fs.stat(path.join(dir, item.name))
        entries.push({
          name: item.name,
          path: rel,
          type: ext === ".mdx" ? "mdx" : "tsx",
          size: stat.size,
          modified: stat.mtime.toISOString(),
        })
      }
    }
  }

  await walk(root, "")
  return entries
}

export async function readContentFile(
  root: string,
  relativePath: string
): Promise<{ content: string; frontmatter: Record<string, unknown> } | null> {
  const safe = sanitizePath(relativePath)
  const fullPath = path.join(root, safe)
  try {
    const raw = await fs.readFile(fullPath, "utf-8")
    const parsed = matter(raw)
    return {
      content: parsed.content,
      frontmatter: parsed.data as Record<string, unknown>,
    }
  } catch {
    return null
  }
}

export async function writeContentFile(
  root: string,
  relativePath: string,
  content: string
): Promise<void> {
  const safe = sanitizePath(relativePath)
  const fullPath = path.join(root, safe)
  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(fullPath, content, "utf-8")
}

export async function deleteContentFile(
  root: string,
  relativePath: string
): Promise<void> {
  const safe = sanitizePath(relativePath)
  const fullPath = path.join(root, safe)
  await fs.unlink(fullPath)
}
