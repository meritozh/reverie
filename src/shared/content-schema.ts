import { z } from 'zod'

export const PostFrontmatterSchema = z.object({
  title: z.string(),
  date: z.coerce.string(),
  tags: z.array(z.string()).default([]),
  status: z.enum(['draft', 'published']).default('draft'),
})

export type PostFrontmatter = z.infer<typeof PostFrontmatterSchema>

export interface ContentEntry {
  slug: string
  frontmatter: PostFrontmatter
  body: string
  filePath: string
  collection: 'posts' | 'components'
}

export interface BuildOptions {
  contentDir: string
  outputDir: string
  baseUrl: string
}

export interface BuildResult {
  success: boolean
  outputDir: string
  pages: string[]
  errors: string[]
  duration: number
}
