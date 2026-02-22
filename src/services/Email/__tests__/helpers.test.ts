/**
 * Unit tests for Email helpers.
 */

import { describe, it, expect } from "vitest"
import {
  getResendClient,
  escapeHtml,
  buildWaitlistEmail,
  buildConsultingEmail,
  buildFeedbackEmail,
} from "@/services/Email/helpers"

describe("Email helpers", () => {
  describe("getResendClient", () => {
    it("returns a client with emails.send", () => {
      const client = getResendClient()
      expect(client).toBeDefined()
      expect(client.emails).toBeDefined()
      expect(typeof client.emails.send).toBe("function")
    })
  })

  describe("escapeHtml", () => {
    it("escapes ampersands", () => {
      expect(escapeHtml("a & b")).toBe("a &amp; b")
    })

    it("escapes less-than", () => {
      expect(escapeHtml("<script>")).toBe("&lt;script&gt;")
    })

    it("escapes greater-than", () => {
      expect(escapeHtml("a > b")).toBe("a &gt; b")
    })

    it("escapes double quotes", () => {
      expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;")
    })

    it("escapes single quotes", () => {
      expect(escapeHtml("it's")).toBe("it&#039;s")
    })

    it("escapes all special characters together", () => {
      expect(escapeHtml(`<a href="x" class='y'>&`)).toBe(
        "&lt;a href=&quot;x&quot; class=&#039;y&#039;&gt;&amp;"
      )
    })

    it("returns empty string for empty input", () => {
      expect(escapeHtml("")).toBe("")
    })

    it("returns safe text unchanged", () => {
      expect(escapeHtml("Hello World 123")).toBe("Hello World 123")
    })
  })

  describe("buildWaitlistEmail", () => {
    it("builds playground waitlist email", () => {
      const msg = buildWaitlistEmail("user@example.com", "playground")
      expect(msg.to).toBe("user@example.com")
      expect(msg.subject).toContain("EffectPatterns Playground")
      expect(msg.html).toContain("EffectPatterns Playground")
      expect(msg.html).toContain("effecttalk.com/patterns")
      expect(msg.from).toContain("noreply@effecttalk.com")
    })

    it("builds code-review waitlist email", () => {
      const msg = buildWaitlistEmail("user@example.com", "code_review")
      expect(msg.subject).toContain("EffectTalk Code Review")
      expect(msg.html).toContain("EffectTalk Code Review")
    })
  })

  describe("buildConsultingEmail", () => {
    it("builds consulting confirmation email", () => {
      const msg = buildConsultingEmail("user@example.com", "Jane")
      expect(msg.to).toBe("user@example.com")
      expect(msg.subject).toBe("We received your consulting inquiry")
      expect(msg.html).toContain("Hi Jane,")
      expect(msg.html).toContain("2 business days")
    })
  })

  describe("buildFeedbackEmail", () => {
    it("builds feedback email with name", () => {
      const msg = buildFeedbackEmail({
        name: "Jane",
        email: "jane@example.com",
        message: "Great site!",
      })
      expect(msg.to).toBe("paul@effecttalk.com")
      expect(msg.replyTo).toBe("jane@example.com")
      expect(msg.subject).toContain("Feedback from Jane")
      expect(msg.html).toContain("Jane &lt;jane@example.com&gt;")
      expect(msg.html).toContain("Great site!")
    })

    it("builds feedback email without name (anonymous)", () => {
      const msg = buildFeedbackEmail({
        name: null,
        email: "anon@example.com",
        message: "Feedback",
      })
      expect(msg.subject).toContain("Anonymous")
      expect(msg.html).toContain("anon@example.com")
    })

    it("escapes HTML in message", () => {
      const msg = buildFeedbackEmail({
        name: null,
        email: "x@example.com",
        message: '<script>alert("xss")</script>',
      })
      expect(msg.html).toContain("&lt;script&gt;")
      expect(msg.html).not.toContain("<script>")
    })
  })
})
