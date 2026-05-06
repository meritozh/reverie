import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const posts = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: '../content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.string(),
    tags: z.array(z.string()).default([]),
    status: z.enum(['draft', 'published']).default('draft'),
  }),
})

export const collections = { posts }
