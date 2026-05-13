export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "My Cloud Service API",
    version: "1.0.0",
    description: "API for high-performance cloud storage with multi-account support and automatic cleanup.",
  },
  servers: [{ url: "/", description: "Current Server" }],
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
    responses: {
      UnauthorizedError: {
        description: "Authentication information is missing or invalid.",
        content: { "application/json": { example: { error: "Unauthorized", message: "Admin session required" } } }
      },
      ForbiddenError: {
        description: "You do not have permission to access this resource.",
        content: { "application/json": { example: { error: "Forbidden", message: "Invalid API Key" } } }
      },
      RateLimitError: {
        description: "Too many requests. Please wait before trying again.",
        content: { "application/json": { example: { error: "Rate limit exceeded", message: "Maximum 5 uploads per 10 minutes for public users" } } }
      }
    }
  },
  tags: [
    { name: "Upload", description: "Direct and resumable upload flows" },
    { name: "Drive", description: "File and folder management" },
    { name: "Accounts", description: "Storage account management" },
    { name: "Auth", description: "Authentication and sessions" },
  ],
  paths: {
    "/api/upload/init": {
      post: {
        tags: ["Upload"],
        summary: "Initialize Resumable Upload",
        description: "Get a Google Drive resumable upload URL. For public mode, no auth is needed but rate limits apply.",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  fileName: { type: "string", example: "holiday_photo.jpg" },
                  mimeType: { type: "string", example: "image/jpeg" },
                  fileSize: { type: "number", example: 5242880 },
                  isPublic: { type: "boolean", example: true },
                },
                required: ["fileName", "mimeType", "fileSize"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                example: {
                  uploadUrl: "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=ADPycd...",
                  accountId: "65f1a2b3c4d5e6f7g8h9i0j1",
                  isPublic: true
                }
              }
            }
          },
          403: { $ref: "#/components/responses/ForbiddenError" },
          429: { $ref: "#/components/responses/RateLimitError" }
        }
      },
    },
    "/api/upload/complete": {
      post: {
        tags: ["Upload"],
        summary: "Finalize Upload",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                accountId: "65f1a2b3c4...",
                fileId: "1AbCdEfGhIjKlMnOpQrStUvWxYz",
                fileName: "holiday_photo.jpg",
                fileSize: 5242880,
                isPublic: true
              }
            }
          }
        },
        responses: {
          200: {
            description: "File recorded successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Public file recorded (auto-delete in 30m)",
                  newUsedStorage: 104857600
                }
              }
            }
          }
        }
      }
    },
    "/api/drive/files": {
      get: {
        tags: ["Drive"],
        summary: "List Files",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "folderId", in: "query", schema: { type: "string" }, description: "Use 'root' or a specific folder ID" },
          { name: "q", in: "query", schema: { type: "string" }, description: "Search by name" }
        ],
        responses: {
          200: {
            description: "Unified file list from all drives",
            content: {
              "application/json": {
                example: {
                  files: [
                    {
                      id: "acc_123:file_abc",
                      name: "Work Project.pdf",
                      mimeType: "application/pdf",
                      size: 2048576,
                      modifiedTime: "2024-03-20T10:00:00Z",
                      accountId: "acc_123",
                      accountName: "Main Storage"
                    }
                  ]
                }
              }
            }
          },
          401: { $ref: "#/components/responses/UnauthorizedError" }
        }
      }
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current Session Status",
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                example: {
                  isAuthenticated: true,
                  user: { email: "admin@example.com", isAdmin: true }
                }
              }
            }
          },
          401: { $ref: "#/components/responses/UnauthorizedError" }
        }
      }
    }
  }
};
