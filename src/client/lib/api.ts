export interface ContentFile {
  name: string
  path: string
  type: "mdx" | "tsx" | "directory"
  size: number
  modified: string
}

export interface FileDetail {
  content: string
  frontmatter: Record<string, unknown>
}

export async function listFiles(): Promise<ContentFile[]> {
  const res = await fetch("/api/files")
  if (!res.ok) throw new Error(`Failed to list files: ${res.status}`)
  const data = await res.json()
  return data.files
}

export async function getFile(path: string): Promise<FileDetail> {
  const res = await fetch(`/api/files/${path}`)
  if (!res.ok) throw new Error(`Failed to get file: ${res.status}`)
  return res.json()
}

export async function createFile(path: string, content: string): Promise<void> {
  const res = await fetch("/api/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content }),
  })
  if (!res.ok) throw new Error(`Failed to create file: ${res.status}`)
}

export async function updateFile(path: string, content: string): Promise<void> {
  const res = await fetch(`/api/files/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(`Failed to update file: ${res.status}`)
}

export async function deleteFile(path: string): Promise<void> {
  const res = await fetch(`/api/files/${path}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error(`Failed to delete file: ${res.status}`)
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append("file", file)
  const res = await fetch("/api/upload/image", {
    method: "POST",
    body: formData,
  })
  if (!res.ok) throw new Error(`Failed to upload image: ${res.status}`)
  return res.json()
}

export interface PreviewRequest {
  code: string
  type: "tsx" | "mdx"
  props?: Record<string, unknown>
}

export interface PreviewResponse {
  html: string
}

export async function renderPreview(request: PreviewRequest): Promise<PreviewResponse> {
  const res = await fetch("/api/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Preview failed: ${error}`)
  }
  return res.json()
}
