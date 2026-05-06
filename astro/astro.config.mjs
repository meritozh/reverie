import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  root: '.',
  srcDir: './src',
  outDir: './dist',
  output: 'static',
  site: 'http://localhost:3000',
  integrations: [react(), mdx(), sitemap()],
  vite: {
    resolve: {
      alias: {
        '@content': '../../content',
      },
    },
  },
})
