import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import open from "open";
import { saveTokens, SCOPES } from "./whoop.js";

const AUTHORIZE = "https://api.prod.whoop.com/oauth/oauth2/auth";
const TOKEN = "https://api.prod.whoop.com/oauth/oauth2/token";

const clientId = process.env.WHOOP_CLIENT_ID!;
const clientSecret = process.env.WHOOP_CLIENT_SECRET!;
const redirectUri = process.env.WHOOP_REDIRECT_URI!;

const state = crypto.randomBytes(16).toString("hex");

const authUrl = new URL(AUTHORIZE);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("redirect_uri", redirectUri);
authUrl.searchParams.set("scope", SCOPES.join(" "));
authUrl.searchParams.set("state", state);

const app = express();

app.get("/callback", async (req, res) => {
  const { code, state: returned, error } = req.query as Record<string, string>;
  if (error) return res.status(400).send(`error: ${error}`);
  if (returned !== state) return res.status(400).send("state mismatch");
  if (!code) return res.status(400).send("missing code");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });
  const r = await fetch(TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) {
    const t = await r.text();
    res.status(500).send(`token exchange failed: ${r.status} ${t}`);
    console.error(t);
    process.exit(1);
  }
  const json = await r.json();
  await saveTokens(json);
  res.send("ok — tokens saved to .tokens.json. you can close this tab.");
  console.log("✓ tokens saved");
  setTimeout(() => process.exit(0), 500);
});

app.listen(3000, async () => {
  console.log("listening on http://localhost:3000");
  console.log("opening:", authUrl.toString());
  await open(authUrl.toString());
});
