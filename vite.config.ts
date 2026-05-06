import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import remarkFrontmatter from 'remark-frontmatter'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({ include: /\.(jsx|tsx|mdx)$/ }),
    tailwindcss(),
    mdx({ remarkPlugins: [remarkFrontmatter] }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src/client'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/content/images': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
