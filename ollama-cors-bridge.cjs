/**
 * Local CORS Bridge for NVIDIA Personal AI Router / Ollama (127.0.0.1:11434) & llama.cpp (127.0.0.1:8080)
 * Allows HTTPS web apps (like https://silas74.github.io/gestione-interventi/) to call local AI endpoints
 * without 403 Forbidden (Origin rejection) or CORS / Private Network Access errors.
 */
const http = require('http');

function createCorsBridge(listenPort, targetHost, targetPort, label) {
  const server = http.createServer((req, res) => {
    const requestOrigin = req.headers['origin'] || '*';

    // Always set full CORS + Chrome Private Network Access headers
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] || 'Content-Type, Authorization, Accept, X-Requested-With'
    );
    res.setHeader('Access-Control-Allow-Private-Network', 'true');

    // Handle preflight OPTIONS immediately
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Clone headers and rewrite Origin/Host so Ollama / nvpair-proxy accepts the request (200 OK instead of 403)
    const forwardHeaders = { ...req.headers };
    forwardHeaders['host'] = `${targetHost}:${targetPort}`;
    forwardHeaders['origin'] = `http://${targetHost}`;
    delete forwardHeaders['referer'];

    const options = {
      hostname: targetHost,
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: forwardHeaders,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      // Forward status code and safe headers while keeping our CORS headers
      const respHeaders = { ...proxyRes.headers };
      delete respHeaders['access-control-allow-origin'];
      delete respHeaders['access-control-allow-methods'];
      delete respHeaders['access-control-allow-headers'];
      delete respHeaders['access-control-allow-credentials'];

      Object.entries(respHeaders).forEach(([k, v]) => {
        if (v !== undefined) res.setHeader(k, v);
      });

      res.writeHead(proxyRes.statusCode || 200);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: `Local AI endpoint ${label} (${targetHost}:${targetPort}) unreachable: ${err.message}`,
        })
      );
    });

    req.pipe(proxyReq, { end: true });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[${label}] Bridge port ${listenPort} already active.`);
    } else {
      console.error(`[${label}] Bridge error:`, err.message);
    }
  });

  server.listen(listenPort, '127.0.0.1', () => {
    console.log(`✅ [${label}] CORS Bridge active: http://127.0.0.1:${listenPort} -> http://${targetHost}:${targetPort}`);
  });
}

// Bridge 11436 -> 11434 (Ollama / NVIDIA Personal AI Router)
createCorsBridge(11436, '127.0.0.1', 11434, 'Ollama-Bridge');

// Bridge 8082 -> 8080 (llama.cpp / NVIDIA Personal AI Router)
createCorsBridge(8082, '127.0.0.1', 8080, 'LlamaCpp-Bridge');
