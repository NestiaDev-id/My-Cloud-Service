import { Hono } from "hono";
import { apiReference } from "@scalar/hono-api-reference";

const app = new Hono({ strict: false });

const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Digital Post Office API",
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
    },
  },
  paths: {
    "/api/upload/init": {
      post: {
        tags: ["Upload"],
        summary: "Initialize Resumable Upload",
        description: "Get a Google Drive resumable upload URL. For private uploads, provide X-API-Key.",
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
        responses: {
          200: {
            description: "Upload initialized successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    uploadUrl: { type: "string" },
                    accountId: { type: "string" },
                    isPublic: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/upload/complete": {
      post: {
        tags: ["Upload"],
        summary: "Complete Upload",
        description: "Notify the backend that the upload to Google Drive is finished to record metadata and update quota.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  accountId: { type: "string" },
                  fileId: { type: "string" },
                  fileName: { type: "string" },
                  fileSize: { type: "number" },
                  mimeType: { type: "string" },
                  isPublic: { type: "boolean" },
                },
                required: ["accountId", "fileId"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Upload completed and recorded",
          },
        },
      },
    },
    "/api/drive/files": {
      get: {
        tags: ["Drive"],
        summary: "List Files",
        description: "Retrieve a unified list of files from all storage accounts.",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Search query" },
          { name: "folderId", in: "query", schema: { type: "string" }, description: "Folder composite ID" },
        ],
        responses: {
          200: {
            description: "List of files retrieved",
          },
        },
      },
    },
  },
};

app.get(
  "*",
  apiReference({
    theme: "purple",
    layout: "modern",
    spec: {
      content: openApiSpec,
    },
  })
);

export default app;
