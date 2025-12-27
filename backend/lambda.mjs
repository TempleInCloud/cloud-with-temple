import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  DeleteCommand, // NEW
} from "@aws-sdk/lib-dynamodb";
import crypto from "node:crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.TABLE_NAME;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "";

const allowedOrigins = ALLOWED_ORIGINS.split(",").map(s => s.trim()).filter(Boolean);

function getOrigin(event) {
  return (
    event?.headers?.origin ||
    event?.headers?.Origin ||
    ""
  );
}

function corsHeaders(origin) {
  const isAllowed = allowedOrigins.length === 0 || allowedOrigins.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : (allowedOrigins[0] || "*"),
    "Vary": "Origin",
    // ADD DELETE here
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    // If you ever send extra headers later, add them here
    "Access-Control-Allow-Headers": "Content-Type,X-Admin-Token",
    "Access-Control-Max-Age": "600",
    "Content-Type": "application/json",
  };
}

function json(statusCode, body, origin) {
  return {
    statusCode,
    headers: corsHeaders(origin),
    body: JSON.stringify(body),
  };
}

// helper for admin auth (keeps code tidy)
function requireAdmin(event, origin) {
  if (!ADMIN_TOKEN) {
    return json(500, { message: "Server misconfigured", error: "ADMIN_TOKEN is missing in Lambda env vars" }, origin);
  }

  const token =
    event?.headers?.["x-admin-token"] ||
    event?.headers?.["X-Admin-Token"] ||
    "";

  if (token !== ADMIN_TOKEN) {
    return json(401, { message: "Unauthorized" }, origin);
  }

  return null; // means OK
}

export const handler = async (event) => {
  const origin = getOrigin(event);

  const method = event?.requestContext?.http?.method || event?.httpMethod;
  const path = event?.rawPath || event?.path || "/";

  // Preflight (OPTIONS)
  if (method === "OPTIONS") {
    // 204 with CORS headers is correct
    return json(204, {}, origin);
  }

  if (!TABLE_NAME) {
    return json(500, { message: "Server misconfigured", error: "TABLE_NAME is missing in Lambda env vars" }, origin);
  }

  // matches /posts or .../posts (some gateways add stage base sometimes)
  const isPostsPath = path === "/posts" || path.endsWith("/posts");

  // detect /posts/{postID}
  // Examples:
  //  /posts/abc
  //  /dev/posts/abc  (if stage somehow appears in path)
  const postsIdMatch = path.match(/\/posts\/([^/]+)$/);
  const postIDFromPath = postsIdMatch ? decodeURIComponent(postsIdMatch[1]) : null;

  // -----------------------------
  // GET /posts (public) - paginated
  // -----------------------------
  if (method === "GET" && isPostsPath) {
    try {
      const qs = event?.queryStringParameters || {};

      const limitRaw = qs.limit;
      const limit = Math.min(Math.max(parseInt(limitRaw || "10", 10) || 10, 1), 50);

      const nextToken = qs.nextToken;
      let exclusiveStartKey = undefined;

      if (nextToken) {
        try {
          const decoded = Buffer.from(nextToken, "base64").toString("utf8");
          exclusiveStartKey = JSON.parse(decoded);
        } catch {
          return json(400, { message: "Invalid nextToken" }, origin);
        }
      }

      const result = await ddb.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          Limit: limit,
          ExclusiveStartKey: exclusiveStartKey,
        })
      );

      const items = result.Items || [];

      // newest first
      items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

      const lastKey = result.LastEvaluatedKey;
      const newNextToken = lastKey
        ? Buffer.from(JSON.stringify(lastKey), "utf8").toString("base64")
        : null;

      return json(200, { items, nextToken: newNextToken }, origin);
    } catch (err) {
      console.error(err);
      return json(500, { message: "Internal server error" }, origin);
    }
  }

  // -----------------------------
  // POST /posts (admin only)
  // -----------------------------
  if (method === "POST" && isPostsPath) {
    const authErr = requireAdmin(event, origin);
    if (authErr) return authErr;

    let body = {};
    try {
      body = event?.body ? JSON.parse(event.body) : {};
    } catch {
      return json(400, { message: "Invalid JSON body" }, origin);
    }

    const title = (body.title || "").trim();
    const content = (body.content || "").trim();

    if (!title || !content) {
      return json(400, { message: "title and content are required" }, origin);
    }

    const item = {
      postID: crypto.randomUUID(),
      title,
      content,
      createdAt: new Date().toISOString(),
    };

    try {
      await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
      return json(201, item, origin);
    } catch (err) {
      console.error(err);
      return json(500, { message: "Internal server error" }, origin);
    }
  }

  // -----------------------------
  // DELETE /posts/{postID} (admin only) NEW
  // -----------------------------
  if (method === "DELETE" && postIDFromPath) {
    const authErr = requireAdmin(event, origin);
    if (authErr) return authErr;

    try {
      await ddb.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { postID: postIDFromPath },
        })
      );

      // Note: DynamoDB delete is idempotent—deleting a non-existing key still "succeeds".
      return json(200, { message: "Deleted", postID: postIDFromPath }, origin);
    } catch (err) {
      console.error(err);
      return json(500, { message: "Internal server error" }, origin);
    }
  }

  return json(404, { message: "Not found", method, path }, origin);
};