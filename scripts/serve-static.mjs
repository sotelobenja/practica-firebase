import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "out");
const port = Number(process.env.PORT ?? 5000);

const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; img-src 'self' https://picsum.photos data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'; upgrade-insecure-requests",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function withCacheHeaders(res, requestPath) {
  const isStaticAsset = requestPath.includes("/_next/static/");
  res.setHeader("Cache-Control", isStaticAsset
    ? "public, max-age=31536000, immutable"
    : "no-cache, no-store, must-revalidate");
}

function resolveFile(requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);
  const clean = decoded === "/" ? "/index.html" : decoded;
  const relative = clean.replace(/^\/+/, "");
  const candidate = path.normalize(relative);

  if (candidate === "" || candidate === ".") {
    return path.join(rootDir, "index.html");
  }

  const directPath = path.join(rootDir, candidate);
  if (directPath.startsWith(rootDir)) {
    return directPath;
  }

  return path.join(rootDir, "index.html");
}

async function sendFile(res, requestPath) {
  const filePath = resolveFile(requestPath);

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".ico": "image/x-icon",
      ".txt": "text/plain; charset=utf-8",
    };

    res.statusCode = 200;
    res.setHeader("Content-Type", mimeTypes[ext] ?? "application/octet-stream");
    Object.entries(securityHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    withCacheHeaders(res, requestPath);
    res.end(data);
  } catch {
    const fallback = path.join(rootDir, "index.html");
    try {
      const data = await fs.readFile(fallback);
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      Object.entries(securityHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      withCacheHeaders(res, requestPath);
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not found");
    }
  }
}

const server = http.createServer(async (req, res) => {
  const requestPath = req.url ?? "/";

  if (requestPath.includes("..")) {
    res.statusCode = 400;
    res.end("Bad request");
    return;
  }

  if (requestPath === "/favicon.ico") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!requestPath.includes(".")) {
    const htmlCandidate = path.join(rootDir, `${requestPath.replace(/^\/+/, "")}.html`);
    const normalized = path.normalize(htmlCandidate);
    try {
      await fs.access(normalized);
      await sendFile(res, `${requestPath}.html`);
      return;
    } catch {
      // fall through to default file serving
    }
  }

  await sendFile(res, requestPath);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Static hosting server listening on http://127.0.0.1:${port}`);
});
