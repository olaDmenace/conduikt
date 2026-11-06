// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hostedSiteOfHost, resolveHostedRoute } from "./host";

describe("hostedSiteOfHost", () => {
  it("extracts the site from a tenant subdomain", () => {
    expect(hostedSiteOfHost("lekki.conduikt.site", "conduikt.site")).toBe("lekki");
    expect(hostedSiteOfHost("Lekki.Conduikt.Site:443", "conduikt.site")).toBe("lekki");
  });
  it("ignores the apex, www, nested hosts and the main app", () => {
    expect(hostedSiteOfHost("conduikt.site", "conduikt.site")).toBeNull();
    expect(hostedSiteOfHost("www.conduikt.site", "conduikt.site")).toBeNull();
    expect(hostedSiteOfHost("a.b.conduikt.site", "conduikt.site")).toBeNull();
    expect(hostedSiteOfHost("conduikt.com", "conduikt.site")).toBeNull();
    expect(hostedSiteOfHost(null, "conduikt.site")).toBeNull();
  });
});

describe("resolveHostedRoute", () => {
  it("rewrites the tenant's own paths onto /p/{site}", () => {
    expect(resolveHostedRoute("lekki", "/")).toEqual({ kind: "rewrite", pathname: "/p/lekki" });
    expect(resolveHostedRoute("lekki", "/pipe-repairs")).toEqual({ kind: "rewrite", pathname: "/p/lekki/pipe-repairs" });
    expect(resolveHostedRoute("lekki", "/sitemap.xml")).toEqual({ kind: "rewrite", pathname: "/p/lekki/sitemap.xml" });
  });
  it("passes the tenant's own /p paths and Next assets through", () => {
    expect(resolveHostedRoute("lekki", "/p/lekki")).toEqual({ kind: "pass" });
    expect(resolveHostedRoute("lekki", "/p/lekki/pipe-repairs")).toEqual({ kind: "pass" });
    expect(resolveHostedRoute("lekki", "/_next/static/chunk.js")).toEqual({ kind: "pass" });
  });
  it("refuses other sites' pages and every API route on a tenant host", () => {
    expect(resolveHostedRoute("lekki", "/p/other-site")).toEqual({ kind: "not_found" });
    expect(resolveHostedRoute("lekki", "/p/other-site/page")).toEqual({ kind: "not_found" });
    expect(resolveHostedRoute("lekki", "/p/lekkitown")).toEqual({ kind: "not_found" });
    expect(resolveHostedRoute("lekki", "/api/projects")).toEqual({ kind: "not_found" });
    expect(resolveHostedRoute("lekki", "/api")).toEqual({ kind: "not_found" });
  });
  it("leaves the main app alone", () => {
    expect(resolveHostedRoute(null, "/dashboard")).toEqual({ kind: "main" });
  });
});
