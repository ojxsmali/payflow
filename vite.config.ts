/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// In development, serve the Vercel function in api/ from the Vite server so the
// send-invoice flow behaves the same locally as when deployed.
function devApi(): Plugin {
  return {
    name: 'payflow-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/send-invoice', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/send-invoice.ts')
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const request = new Request(`http://localhost${req.originalUrl ?? req.url}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
          })
          const handler = mod[req.method ?? 'GET'] as ((r: Request) => Promise<Response>) | undefined
          const response = handler ? await handler(request) : new Response('Method not allowed', { status: 405 })
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (e) {
          server.config.logger.error(String(e))
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Something went wrong on the server.' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // expose server-only variables (RESEND_API_KEY etc.) to the dev API handler via process.env
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react(), tailwindcss(), devApi()],
    server: { port: 5195 },
    build: {
      // the PDF renderer (~1.2 MB) is its own chunk, loaded only when a PDF is generated
      chunkSizeWarningLimit: 1300,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/@supabase')) return 'supabase'
            return undefined
          },
        },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }
})

