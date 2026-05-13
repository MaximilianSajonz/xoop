import fs from "node:fs/promises";
import path from "node:path";

const TOKEN_PATH = path.resolve(".tokens.json");
const API = "https://api.prod.whoop.com/developer";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

export const SCOPES = [
  "read:recovery",
  "read:sleep",
  "read:workout",
  "read:cycles",
  "read:profile",
  "read:body_measurement",
  "offline",
];

export type Tokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

export async function saveTokens(t: Omit<Tokens, "expires_at"> & { expires_in: number }) {
  const tokens: Tokens = {
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: Date.now() + t.expires_in * 1000 - 60_000,
  };
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  return tokens;
}

export async function loadTokens(): Promise<Tokens> {
  const raw = await fs.readFile(TOKEN_PATH, "utf8");
  return JSON.parse(raw);
}

async function refresh(tokens: Tokens): Promise<Tokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!,
    scope: SCOPES.join(" "),
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`refresh failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return await saveTokens(json);
}

export async function getAccessToken(): Promise<string> {
  let t = await loadTokens();
  if (Date.now() >= t.expires_at) t = await refresh(t);
  return t.access_token;
}

async function api<T>(p: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(API + p);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`GET ${p} ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

type Page<T> = { records: T[]; next_token?: string };

async function paginate<T>(p: string, start?: string, end?: string): Promise<T[]> {
  const out: T[] = [];
  let nextToken: string | undefined;
  do {
    const page: Page<T> = await api(p, { start, end, nextToken, limit: 25 });
    out.push(...page.records);
    nextToken = page.next_token;
  } while (nextToken);
  return out;
}

export const whoop = {
  profile: () => api<{ user_id: number; email: string; first_name: string; last_name: string }>("/v1/user/profile/basic"),
  bodyMeasurement: () => api("/v1/user/measurement/body"),
  cycles: (start?: string, end?: string) => paginate<any>("/v1/cycle", start, end),
  recovery: (start?: string, end?: string) => paginate<any>("/v1/recovery", start, end),
  sleep: (start?: string, end?: string) => paginate<any>("/v1/activity/sleep", start, end),
  workouts: (start?: string, end?: string) => paginate<any>("/v1/activity/workout", start, end),
};
