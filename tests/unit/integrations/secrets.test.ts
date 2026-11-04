import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SECRET_NAMES = ["SUPABASE_SERVICE_ROLE_KEY", "DISCORD_CLIENT_SECRET", "DISCORD_BOT_TOKEN", "GOOGLE_SERVICE_ACCOUNT_CREDENTIALS", "ANCHORCAD_API_KEY", "ROSTER_SYNC_SECRET"];

function files(dir: string, out: string[] = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

describe("secrets stay out of the website", () => {
  it("the browser code reads only NEXT_PUBLIC_ variables", () => {
    for (const f of files("src")) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(/process\.env\.([A-Z0-9_]+)/g)) expect(m[1], f).toMatch(/^NEXT_PUBLIC_/);
      for (const name of SECRET_NAMES) expect(text.includes(name), `${f} mentions ${name}`).toBe(false);
    }
  });

  it("secret variables are read only inside Edge Function entrypoints", () => {
    const shared = files("supabase/functions/_shared")
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    expect(shared).not.toMatch(/Deno\.env/);
  });

  it("env files with values are ignored by git", () => {
    const gi = readFileSync(".gitignore", "utf8");
    expect(gi).toMatch(/^\.env\*$/m);
    expect(readFileSync(".env.example", "utf8")).not.toMatch(/ank_v1\.[A-Za-z0-9-]+\.[A-Za-z0-9_-]{8,}|-----BEGIN PRIVATE KEY-----|\b\d{17,20}\b/);
  });
});
