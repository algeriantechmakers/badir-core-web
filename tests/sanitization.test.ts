import {
  sanitizeHTMLServer,
  sanitizePlainText,
  sanitizeRichText,
} from "@/lib/santitize-server";
import { describe, expect, it } from "vitest";

describe("server sanitization", () => {
  it("removes scripts and event handlers from rich HTML", () => {
    const result = sanitizeHTMLServer(
      '<p onclick="alert(1)">Safe</p><script>alert(2)</script>',
    );
    expect(result).toContain("<p>Safe</p>");
    expect(result).not.toContain("<script");
    expect(result).not.toContain("onclick");
  });

  it("strips all markup from plain text", () => {
    expect(sanitizePlainText("<b>Hello</b> <script>x</script>")).toBe("Hello ");
  });

  it("keeps permitted rich text while rejecting unsafe links", () => {
    const result = sanitizeRichText(
      '<strong>Useful</strong><a href="javascript:alert(1)">link</a><div>no</div>',
    );
    expect(result).toContain("<strong>Useful</strong>");
    expect(result).not.toContain("javascript:");
    expect(result).not.toContain("<div>");
  });
});
