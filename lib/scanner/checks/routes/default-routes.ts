// Default routes to check (hardcoded common paths)

export const DEFAULT_ROUTES = [
  "/",
  "/login",
  "/register",
  "/signup",
  "/dashboard",
  "/admin",
  "/panel",
  "/api",
  "/api/users",
  "/api/auth",
  "/debug",
  "/test",
  "/staging",
  "/dev",
  "/docs",
  "/swagger",
  "/graphql",
  "/health",
  "/status",
  "/version",
]

// Files that may contain route information
export const DISCOVERY_FILES = ["/robots.txt", "/sitemap.xml"]

// Keywords that increase risk score
export const SENSITIVE_KEYWORDS = [
  "user",
  "users",
  "email",
  "token",
  "auth",
  "password",
  "secret",
  "key",
  "admin",
  "config",
  "backup",
  "database",
  "db",
  "id",
  "session",
  "credential",
]
