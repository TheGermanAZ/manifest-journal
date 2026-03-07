import { describe, it, expect } from "vitest";
import { isAllowedOrigin, parseOrigins } from "./auth";

describe("parseOrigins", () => {
  it("parses comma-separated origins", () => {
    expect(parseOrigins("https://a.com,https://b.com")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });

  it("trims whitespace around origins", () => {
    expect(parseOrigins("  https://a.com , https://b.com  ")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });

  it("filters out empty strings", () => {
    expect(parseOrigins("https://a.com,,,,https://b.com")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });

  it("returns empty array for undefined", () => {
    expect(parseOrigins(undefined)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseOrigins("")).toEqual([]);
  });
});

describe("isAllowedOrigin", () => {
  // Security-critical: these tests protect against CORS misconfiguration

  it("allows localhost:3000", () => {
    expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
  });

  it("allows any *.vercel.app subdomain over HTTPS", () => {
    expect(isAllowedOrigin("https://my-app-abc123.vercel.app")).toBe(true);
    expect(isAllowedOrigin("https://preview-xyz.vercel.app")).toBe(true);
  });

  it("rejects vercel.app over HTTP (not HTTPS)", () => {
    // HTTP origins should never be trusted for vercel.app
    expect(isAllowedOrigin("http://my-app.vercel.app")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isAllowedOrigin("")).toBe(false);
  });

  it("rejects arbitrary domains", () => {
    expect(isAllowedOrigin("https://evil.com")).toBe(false);
    expect(isAllowedOrigin("https://attacker.io")).toBe(false);
  });

  it("rejects domains that merely contain 'vercel.app'", () => {
    // Subdomain spoofing: evil.com.vercel.app would pass endsWith,
    // but fake-vercel.app should not
    expect(isAllowedOrigin("https://fake-vercel.app")).toBe(false);
  });

  it("rejects malformed URLs gracefully", () => {
    expect(isAllowedOrigin("not-a-url")).toBe(false);
    expect(isAllowedOrigin("://broken")).toBe(false);
  });

  it("rejects localhost on wrong port", () => {
    // Only port 3000 is hardcoded as allowed
    expect(isAllowedOrigin("http://localhost:4000")).toBe(false);
    expect(isAllowedOrigin("http://localhost:8080")).toBe(false);
  });
});
