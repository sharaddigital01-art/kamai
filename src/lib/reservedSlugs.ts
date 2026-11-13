/**
 * Routes and static assets that must never be treated as short slugs
 * or allowed as custom shortlinks.
 */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "contact",
  "dashboard",
  "earnings",
  "l",
  "links",
  "login",
  "make-links",
  "partners",
  "privacy",
  "profile",
  "r",
  "reports",
  "settings",
  "signup",
  "telegram-bot",
  "terms",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "_next",
]);
