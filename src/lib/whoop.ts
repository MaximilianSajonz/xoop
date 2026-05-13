import { sbAdmin } from "./supabase";

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

type StoredToken = {
  id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

export async function loadToken(): Promise<StoredToken | null> {
  const { data } = await sbAdmin()
    .from("whoop_tokens")
    .select("*")
    .eq("id", "default")
    .maybeSingle();
  return (data as StoredToken | null) ?? null;
}

export async function saveToken(t: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}) {
  const expires_at = new Date(Date.now() + t.expires_in * 1000 - 60_000).toISOString();
  await sbAdmin()
    .from("whoop_tokens")
    .upsert({
      id: "default",
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expires_at,
    });
}

async function refresh(refresh_token: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token,
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
  await saveToken(json);
  return json.access_token as string;
}

async function getAccessToken(): Promise<string> {
  const t = await loadToken();
  if (!t) throw new Error("no token — visit /api/auth/start");
  if (Date.now() >= new Date(t.expires_at).getTime()) return refresh(t.refresh_token);
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
  profile: () => api<any>("/v2/user/profile/basic"),
  bodyMeasurement: () => api<any>("/v2/user/measurement/body"),
  cycles: (start?: string, end?: string) => paginate<any>("/v2/cycle", start, end),
  recovery: (start?: string, end?: string) => paginate<any>("/v2/recovery", start, end),
  sleep: (start?: string, end?: string) => paginate<any>("/v2/activity/sleep", start, end),
  workouts: (start?: string, end?: string) => paginate<any>("/v2/activity/workout", start, end),
};

export async function exchangeCode(code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!,
    redirect_uri: process.env.WHOOP_REDIRECT_URI!,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  await saveToken(json);
}
