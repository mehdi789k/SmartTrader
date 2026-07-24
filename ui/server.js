import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import expressHttpProxy from 'express-http-proxy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;
const API_TARGET = process.env.API_TARGET || 'http://127.0.0.1:8000';

// Middleware for logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Serve static files from dist
app.use(express.static(join(__dirname, 'dist')));

// Parse JSON
app.use(express.json());

// Proxy API requests
app.use('/api', expressHttpProxy(API_TARGET, {
  proxyReqPathResolver: (req) => req.originalUrl,
  changeOrigin: true,
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    return proxyResData;
  },
  proxyErrorHandler: (err, res, next) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error' });
  }
}));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Frontend server running on http://127.0.0.1:${PORT}`);
  console.log(`Proxying /api to ${API_TARGET}`);
});
