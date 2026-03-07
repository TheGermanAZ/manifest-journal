import { describe, it, expect } from "vitest";
import {
  AuthError,
  NotFoundError,
  ValidationError,
  ConflictError,
  AIError,
  formatError,
} from "./errors";

describe("error classes", () => {
  describe("AuthError", () => {
    it("has default message", () => {
      const err = new AuthError();
      expect(err.message).toBe("Not authenticated");
      expect(err.code).toBe("AUTH_ERROR");
      expect(err.name).toBe("AuthError");
    });

    it("accepts custom message", () => {
      const err = new AuthError("User not provisioned");
      expect(err.message).toBe("User not provisioned");
    });

    it("is instanceof Error", () => {
      expect(new AuthError()).toBeInstanceOf(Error);
    });
  });

  describe("NotFoundError", () => {
    it("formats resource name only", () => {
      const err = new NotFoundError("Entry");
      expect(err.message).toBe("Entry not found");
      expect(err.code).toBe("NOT_FOUND");
    });

    it("formats resource name + id", () => {
      const err = new NotFoundError("Entry", "abc123");
      expect(err.message).toBe("Entry not found: abc123");
    });
  });

  describe("ValidationError", () => {
    it("carries field name", () => {
      const err = new ValidationError("Too long", "content");
      expect(err.message).toBe("Too long");
      expect(err.field).toBe("content");
      expect(err.code).toBe("VALIDATION_ERROR");
    });

    it("works without field", () => {
      const err = new ValidationError("Invalid input");
      expect(err.field).toBeUndefined();
    });
  });

  describe("ConflictError", () => {
    it("carries message and code", () => {
      const err = new ConflictError("Already on a path");
      expect(err.message).toBe("Already on a path");
      expect(err.code).toBe("CONFLICT");
    });
  });

  describe("AIError", () => {
    it("wraps an upstream Error with context", () => {
      const upstream = new Error("timeout");
      const err = new AIError("analyzeEntry", upstream);
      expect(err.message).toBe("AI analyzeEntry failed: timeout");
      expect(err.code).toBe("AI_ERROR");
      expect(err.provider).toBe("openrouter");
      expect(err.operation).toBe("analyzeEntry");
      expect(err.cause).toBe(upstream);
    });

    it("wraps a string thrown value", () => {
      const err = new AIError("embedding", "network error");
      expect(err.message).toBe("AI embedding failed: network error");
    });

    it("accepts custom provider", () => {
      const err = new AIError("generate", new Error("fail"), "anthropic");
      expect(err.provider).toBe("anthropic");
    });
  });
});

describe("formatError", () => {
  it("extracts message from Error instances", () => {
    expect(formatError(new Error("oops"))).toBe("oops");
  });

  it("extracts message from custom error classes", () => {
    expect(formatError(new AuthError("denied"))).toBe("denied");
    expect(formatError(new NotFoundError("Entry"))).toBe("Entry not found");
  });

  it("converts strings to string", () => {
    expect(formatError("raw string")).toBe("raw string");
  });

  it("converts numbers to string", () => {
    expect(formatError(404)).toBe("404");
  });

  it("converts null/undefined to string", () => {
    expect(formatError(null)).toBe("null");
    expect(formatError(undefined)).toBe("undefined");
  });
});
