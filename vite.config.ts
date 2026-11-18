import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import type { IncomingMessage, ServerResponse } from 'http'

/**
 * Lightweight in-memory real-time room API + Server-Sent Events (SSE) plugin for Vite dev/preview.
 * Allows multiple separate browser profiles / Chrome windows / devices to share rooms
 * in real time even before GCP / Firebase credentials are configured in .env.
 */
function devRealtimeRoomsPlugin(): Plugin {
  const rooms = new Map<string, unknown>()
  const clients = new Set<ServerResponse>()

  const broadcast = (roomId: string, room: unknown) => {
    const payload = `data: ${JSON.stringify({ roomId, room })}\n\n`
    for (const res of clients) {
      res.write(payload)
    }
  }

  const attachMiddleware = (middlewares: {
    use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void
  }) => {
    middlewares.use((req, res, next) => {
      if (!req.url?.startsWith('/__dev_rooms')) {
        next()
        return
      }

      const url = new URL(req.url, 'http://localhost')

      // SSE stream: GET /__dev_rooms/events
      if (req.method === 'GET' && url.pathname === '/__dev_rooms/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        })
        res.write('\n')
        clients.add(res)
        req.on('close', () => {
          clients.delete(res)
        })
        return
      }

      // Single room endpoint: /__dev_rooms/:roomId
      const match = url.pathname.match(/^\/__dev_rooms\/([A-Za-z0-9_-]+)$/)
      if (!match) {
        res.statusCode = 404
        res.end()
        return
      }

      const roomId = match[1].toUpperCase()

      if (req.method === 'GET') {
        const room = rooms.get(roomId) ?? null
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ room }))
        return
      }

      if (req.method === 'POST') {
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body)
            rooms.set(roomId, parsed.room)
            broadcast(roomId, parsed.room)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, room: parsed.room }))
          } catch {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Invalid JSON' }))
          }
        })
        return
      }

      next()
    })
  }

  return {
    name: 'dev-realtime-rooms',
    configureServer(server) {
      attachMiddleware(server.middlewares)
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares)
    },
  }
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    devRealtimeRoomsPlugin(),
  ],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
})
