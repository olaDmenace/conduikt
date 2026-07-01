// OAuth 1.0a signing for X's v1.1 endpoints (mostly used for chunked media
// upload, which doesn't authenticate OAuth 2.0 user tokens cleanly).
//
// All four credentials must be set as env vars:
//   X_OAUTH1_CONSUMER_KEY        — app-level (API Key in dev portal)
//   X_OAUTH1_CONSUMER_SECRET     — app-level (API Key Secret)
//   X_OAUTH1_ACCESS_TOKEN        — user-level for @olaDmenace
//   X_OAUTH1_ACCESS_TOKEN_SECRET — user-level
//
// Generate at https://developer.x.com → your app → Keys and tokens.
// The app needs Read+Write permission AND access to media endpoints.

import crypto from "node:crypto";

export interface OAuth1Creds {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export function getOAuth1CredsFromEnv(): OAuth1Creds | null {
  const consumerKey = process.env.X_OAUTH1_CONSUMER_KEY;
  const consumerSecret = process.env.X_OAUTH1_CONSUMER_SECRET;
  const accessToken = process.env.X_OAUTH1_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_OAUTH1_ACCESS_TOKEN_SECRET;
  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    return null;
  }
  return { consumerKey, consumerSecret, accessToken, accessTokenSecret };
}

/**
 * Builds an OAuth 1.0a "Authorization: OAuth ..." header for a signed request.
 *
 * @param method     HTTP method ("GET" or "POST")
 * @param url        Full URL with no query string (query goes in queryParams)
 * @param bodyParams Form-encoded body params (NOT raw binary; for multipart
 *                   uploads, pass an empty object — RFC 5849 §3.4.1.3.1 says
 *                   form-encoded params only)
 * @param queryParams URL query params (for `?command=STATUS&media_id=...`)
 */
export function buildOAuth1Header(
  method: "GET" | "POST",
  url: string,
  bodyParams: Record<string, string>,
  queryParams: Record<string, string>,
  creds: OAuth1Creds
): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: creds.consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };

  // RFC 5849: signature base string includes oauth_* params + query params
  // + form-urlencoded body params (NOT multipart body parts).
  const allParams: Record<string, string> = { ...oauth, ...queryParams, ...bodyParams };

  const encodedParams = Object.keys(allParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(encodedParams),
  ].join("&");

  const signingKey =
    percentEncode(creds.consumerSecret) + "&" + percentEncode(creds.accessTokenSecret);

  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  const headerParams: Record<string, string> = { ...oauth, oauth_signature: signature };

  return (
    "OAuth " +
    Object.keys(headerParams)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(headerParams[k])}"`)
      .join(", ")
  );
}

// RFC 3986 percent-encoding (stricter than encodeURIComponent — encodes !*'() too).
function percentEncode(s: string): string {
  return encodeURIComponent(s)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}
