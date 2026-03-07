import { describe, it, expect } from "vitest";
import { formatError } from "./errors";

describe("formatError", () => {
  it("extracts message from Error", () => {
    expect(formatError(new Error("fail"))).toBe("fail");
  });

  it("extracts message from TypeError", () => {
    expect(formatError(new TypeError("bad type"))).toBe("bad type");
  });

  it("converts non-Error values to string", () => {
    expect(formatError("string error")).toBe("string error");
    expect(formatError(42)).toBe("42");
    expect(formatError(null)).toBe("null");
    expect(formatError(undefined)).toBe("undefined");
    expect(formatError({ code: 500 })).toBe("[object Object]");
  });
});
