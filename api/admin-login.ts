// ============================================================================
// /api/admin-login.ts — Vercel Serverless Function (demo / non-Supabase login)
//
// WHY THIS EXISTS: the storefront must not ship an admin password inside the
// client bundle. Supabase deployments use Supabase Auth (server-side, already
// fine). THIS function covers the no-Supabase "demo" mode: credentials are
// checked HERE, server-side, against environment variables.
//
// ENV VARIABLES (set in Vercel → Project → Settings → Environment Variables):
//   ADMIN_EMAIL      e.g. store-owner@jia.eg   (required for demo login)
//   ADMIN_PASSWORD   a long random string      (required for demo login)
//
// TODO(real DB): replace this file's token logic with proper opaque session
// storage (e.g. an admin_sessions table + random session id + expiry) or
// HTTPS-only cookie auth once a database other than Supabase Auth is used.
// The token below is deliberately minimal because demo mode holds NO real
// data — it only unlocks the read-only demo dashboard.
// ============================================================================

// Minimal request/response shapes — avoids adding @vercel/node types as a dep.
interface Req { method?: string; body?: unknown }
interface Res {
  status: (code: number) => Res & { json: (v: unknown) => void };
}

// Minimal HMAC-SHA256 via Web Crypto (node runtime supports crypto.subtle).
async function hmac(secret: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method-not-allowed" });
  }

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    // Demo login is intentionally disabled when env vars are absent.
    return res
      .status(500)
      .json({ ok: false, error: "ADMIN_EMAIL / ADMIN_PASSWORD env vars not set" });
  }

  const body = (req.body ?? {}) as { email?: string; password?: string };
  const e = String(body.email ?? "");
  const p = String(body.password ?? "");

  // Constant-time-ish comparison (length+XOR); good enough for demo mode.
  const slowEq = (a: string, b: string) => {
    const bb = new TextEncoder().encode(b);
    const aa = new TextEncoder().encode(a);
    const n = Math.max(aa.length, bb.length, 16);
    let diff = 0;
    for (let i = 0; i < n; i++) diff |= (aa[i] ?? 0) ^ (bb[i] ?? 0);
    return diff === 0;
  };

  if (!slowEq(e, email) || !slowEq(p, password)) {
    // Same generic message for unknown email / wrong password.
    await new Promise((r) => setTimeout(r, 400)); // tiny delay, no lockouts
    return res.status(401).json({ ok: false, error: "invalid" });
  }

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 12; // 12h session
  // Demo signing secret: derived from the password env var (never logged, never stored).
  const payload = `jia-admin.${exp}`;
  const token = `${payload}.${await hmac(password, payload)}`;

  return res.status(200).json({ ok: true, token, exp });
}
