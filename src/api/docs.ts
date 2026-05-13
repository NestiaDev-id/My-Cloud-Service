export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "My Cloud Service API",
    version: "1.0.0",
    description: "API for high-performance cloud storage with multi-account support and automatic cleanup.",
  },
  servers: [
    {
      url: "/",
      description: "Current Server",
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "Your secret API key for private uploads.",
      },
      CookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "admin_token",
        description: "Session cookie for admin operations.",
      },
    },
  },
  tags: [
    { name: "Upload", description: "Direct and resumable upload flows" },
    { name: "Drive", description: "File and folder management" },
    { name: "Accounts", description: "Storage account management" },
    { name: "Auth", description: "Authentication and sessions" },
  ],
  paths: {
    "/api/auth/url": {
      get: {
        tags: ["Auth"],
        summary: "Get OAuth URL",
        description: "Generates a Google OAuth2 authorization URL for onboarding a new account.",
        parameters: [
          { name: "name", in: "query", schema: { type: "string" }, description: "Custom label for the account" }
        ],
        responses: { 200: { description: "Success", content: { "application/json": { schema: { type: "object", properties: { url: { type: "string" } } } } } } }
      }
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current Session Status",
        description: "Checks if the current session is an active admin session.",
        responses: { 200: { description: "Success" } }
      }
    },
    "/api/upload/init": {
      post: {
        tags: ["Upload"],
        summary: "Initialize Resumable Upload",
        description: "Get a Google Drive resumable upload URL. Use X-API-Key for private mode or set isPublic: true for anonymous uploads (30m TTL).",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  fileName: { type: "string", example: "document.pdf" },
                  mimeType: { type: "string", example: "application/pdf" },
                  fileSize: { type: "number", example: 1048576 },
                  isPublic: { type: "boolean", example: true },
                },
                required: ["fileName", "mimeType", "fileSize"],
              },
            },
          },
        },
        responses: { 200: { description: "Success", content: { "application/json": { schema: { type: "object", properties: { uploadUrl: { type: "string" }, accountId: { type: "string" } } } } } } }
      },
    },
    "/api/upload/status": {
      get: {
        tags: ["Upload"],
        summary: "Check Upload Status",
        description: "Retrieve current storage usage and percentage for a specific account.",
        parameters: [
          { name: "accountId", in: "query", schema: { type: "string" }, required: true }
        ],
        responses: { 200: { description: "Success" } }
      }
    },
    "/api/upload/complete": {
      post: {
        tags: ["Upload"],
        summary: "Finalize Upload",
        description: "Notify the backend to record metadata and update quotas after the direct PUT to Google is finished.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { accountId: { type: "string" }, fileId: { type: "string" }, fileSize: { type: "number" }, isPublic: { type: "boolean" } }, required: ["accountId", "fileId"] } } }
        },
        responses: { 200: { description: "Success" } }
      }
    },
    "/api/drive/files": {
      get: {
        tags: ["Drive"],
        summary: "List Files",
        description: "Retrieve a list of files from one or all accounts. Supports filtering by parent folder or query.",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "accountId", in: "query", schema: { type: "string" } },
          { name: "folderId", in: "query", schema: { type: "string" } },
          { name: "q", in: "query", schema: { type: "string" } }
        ],
        responses: { 200: { description: "Success" } }
      }
    },
    "/api/drive/files/{id}": {
      patch: {
        tags: ["Drive"],
        summary: "Update/Rename File",
        description: "Update file metadata (like name) on Google Drive.",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Composite ID (accountId:fileId)" }
        ],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" } } } } } },
        responses: { 200: { description: "Success" } }
      },
      delete: {
        tags: ["Drive"],
        summary: "Permanently Delete",
        description: "Deletes a file permanently from Google Drive (bypasses trash).",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: { 200: { description: "Success" } }
      }
    },
    "/api/drive/files/{id}/move": {
      post: {
        tags: ["Drive"],
        summary: "Move File",
        description: "Move a file to a different folder within the same account.",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { targetFolderId: { type: "string" } } } } } },
        responses: { 200: { description: "Success" } }
      }
    },
    "/api/accounts": {
      get: {
        tags: ["Accounts"],
        summary: "List Connected Accounts",
        security: [{ CookieAuth: [] }],
        responses: { 200: { description: "Success" } }
      }
    },
    "/api/accounts/refresh-all": {
      post: {
        tags: ["Accounts"],
        summary: "Refresh All Quotas",
        description: "Forces a fresh storage quota check for all connected accounts and clears metadata cache.",
        security: [{ CookieAuth: [] }],
        responses: { 200: { description: "Success" } }
      }
    }
  }
};
