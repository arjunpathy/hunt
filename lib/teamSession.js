import crypto from "crypto";

const TEAM_COOKIE_NAME = "hunt_team_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding =
    normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function getSessionSecret() {
  const secret = process.env.TEAM_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "TEAM_SESSION_SECRET environment variable is not set. Add it to your deployment settings.",
    );
  }
  return secret;
}

function sign(unsignedToken) {
  return encodeBase64Url(
    crypto
      .createHmac("sha256", getSessionSecret())
      .update(unsignedToken)
      .digest(),
  );
}

export function createSessionToken(payload) {
  const fullPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };

  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = encodeBase64Url(JSON.stringify(fullPayload));
  const unsigned = `${header}.${body}`;
  const signature = sign(unsigned);

  return `${unsigned}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [header, body, signature] = parts;
  const unsigned = `${header}.${body}`;
  const expected = sign(unsigned);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(body));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) {
      return acc;
    }

    acc[rawKey] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

export function getSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return verifySessionToken(cookies[TEAM_COOKIE_NAME]);
}

export function setSessionCookie(res, token) {
  const secureFlag = process.env.NODE_ENV === "production" ? "Secure; " : "";
  res.setHeader(
    "Set-Cookie",
    `${TEAM_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; ${secureFlag}Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  );
}

export function clearSessionCookie(res) {
  const secureFlag = process.env.NODE_ENV === "production" ? "Secure; " : "";
  res.setHeader(
    "Set-Cookie",
    `${TEAM_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; ${secureFlag}Max-Age=0`,
  );
}
