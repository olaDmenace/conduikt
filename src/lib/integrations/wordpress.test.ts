// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { normaliseBaseUrl, testWordPressConnection, upsertWordPressPage } from "./wordpress";

const conn = { baseUrl: "https://blog.example.com/", username: "olu", appPassword: "abcd efgh" };

function recorder(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return handler(url, init);
  });
  return { calls, fetchImpl };
}

describe("wordpress client", () => {
  it("normalises the base url", () => {
    expect(normaliseBaseUrl("blog.example.com/")).toBe("https://blog.example.com");
    expect(normaliseBaseUrl("https://example.com/wp/")).toBe("https://example.com/wp");
  });

  it("creates a page when no page has that slug", async () => {
    const { calls, fetchImpl } = recorder((url, init) => {
      if (url.includes("/pages?slug=")) return new Response("[]", { status: 200 });
      expect(init?.method).toBe("POST");
      return new Response(JSON.stringify({ id: 12, link: "https://blog.example.com/plumber-lagos/" }), { status: 201 });
    });
    const out = await upsertWordPressPage(conn, { slug: "plumber-lagos", title: "Plumber in Lagos", content: "<p>Hi</p>" }, fetchImpl);
    expect(out).toEqual({ id: 12, link: "https://blog.example.com/plumber-lagos/", created: true });
    expect(calls[0].url).toBe("https://blog.example.com/wp-json/wp/v2/pages?slug=plumber-lagos&status=publish,draft,pending,private&per_page=1&context=edit");
    expect(calls[1].url).toBe("https://blog.example.com/wp-json/wp/v2/pages");
    const headers = calls[1].init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from("olu:abcd efgh").toString("base64")}`);
    expect(JSON.parse(String(calls[1].init?.body)).status).toBe("publish");
  });

  it("updates the existing page with that slug", async () => {
    const { calls, fetchImpl } = recorder((url) => {
      if (url.includes("/pages?slug=")) return new Response(JSON.stringify([{ id: 7 }]), { status: 200 });
      return new Response(JSON.stringify({ id: 7, link: "https://blog.example.com/x/" }), { status: 200 });
    });
    const out = await upsertWordPressPage(conn, { slug: "x", title: "X", content: "<p>Hi</p>" }, fetchImpl);
    expect(out.created).toBe(false);
    expect(calls[1].url).toBe("https://blog.example.com/wp-json/wp/v2/pages/7");
  });

  it("surfaces WordPress's message on failure", async () => {
    const { fetchImpl } = recorder((url) => {
      if (url.includes("/pages?slug=")) return new Response("[]", { status: 200 });
      return new Response(JSON.stringify({ message: "Sorry, you are not allowed to create pages as this user." }), { status: 401 });
    });
    await expect(upsertWordPressPage(conn, { slug: "x", title: "X", content: "" }, fetchImpl)).rejects.toThrow(/not allowed/);
  });

  it("tests the connection with /users/me", async () => {
    const { calls, fetchImpl } = recorder(() => new Response(JSON.stringify({ name: "Olu", capabilities: { publish_pages: true } }), { status: 200 }));
    expect(await testWordPressConnection(conn, fetchImpl)).toEqual({ ok: true, name: "Olu" });
    expect(calls[0].url).toContain("/wp-json/wp/v2/users/me");

    const bad = recorder(() => new Response("", { status: 401 }));
    const res = await testWordPressConnection(conn, bad.fetchImpl);
    expect(res.ok).toBe(false);
  });
});
