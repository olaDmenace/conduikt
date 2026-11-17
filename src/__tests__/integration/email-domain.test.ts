import { describe, it, expect, vi, beforeEach } from "vitest";

const createDomainMock = vi.fn();
const deleteDomainMock = vi.fn();
const getDomainMock = vi.fn();
const verifyDomainMock = vi.fn();

vi.mock("@/src/lib/email/marketing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/email/marketing")>();
  return {
    ...actual,
    createDomain: (...a: unknown[]) => createDomainMock(...a),
    deleteDomain: (...a: unknown[]) => deleteDomainMock(...a),
    getDomain: (...a: unknown[]) => getDomainMock(...a),
    verifyDomain: (...a: unknown[]) => verifyDomainMock(...a),
  };
});

const fromMock = vi.fn();
const authGetUserMock = vi.fn();
vi.mock("@/src/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: fromMock, auth: { getUser: authGetUserMock } }),
}));

const USER = { id: "user-1", email: "t@example.com" };

const RESEND_DOMAIN = {
  id: "rd-1",
  name: "mail.acme.com",
  status: "not_started",
  records: [
    { record: "SPF", name: "send", type: "MX", value: "feedback-smtp.resend.com", priority: 10, status: "not_started" },
    { record: "DKIM", name: "resend._domainkey", type: "TXT", value: "p=MIGf...", status: "not_started" },
  ],
};

const DOMAIN_ROW = {
  id: "vd-1",
  user_id: "user-1",
  domain: "mail.acme.com",
  resend_domain_id: "rd-1",
  status: "pending",
  dns_records: [],
  from_local_part: "hello",
  verified_at: null,
  last_checked_at: null,
  created_at: "2026-11-17T00:00:00Z",
  updated_at: "2026-11-17T00:00:00Z",
};

// Per-table chain factories, same approach as email-audiences.test.ts.
type Chain = Record<string, any>;
function profileChain(plan: string): Chain {
  const c: Chain = { select: vi.fn(), eq: vi.fn(), single: vi.fn().mockResolvedValue({ data: { plan }, error: null }) };
  c.select.mockReturnValue(c);
  c.eq.mockReturnValue(c);
  return c;
}
function domainsChain(opts: { existing?: unknown; inserted?: unknown; updated?: unknown }): Chain {
  const c: Chain = {};
  for (const m of ["select", "eq", "order", "limit", "insert", "update", "delete"]) c[m] = vi.fn().mockReturnValue(c);
  c.maybeSingle = vi.fn().mockImplementation(() =>
    Promise.resolve({ data: c._afterUpdate ? (opts.updated ?? opts.existing ?? null) : (opts.existing ?? null), error: null })
  );
  c.single = vi.fn().mockResolvedValue({ data: opts.inserted ?? null, error: opts.inserted ? null : { message: "insert failed" } });
  c.update.mockImplementation(() => {
    c._afterUpdate = true;
    return c;
  });
  // `await supabase.from().delete().eq()` resolves the chain itself.
  c.then = (res: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(res);
  return c;
}
function wire(tables: Record<string, () => Chain>) {
  const made: Record<string, Chain> = {};
  fromMock.mockImplementation((table: string) => {
    if (!made[table]) made[table] = tables[table] ? tables[table]() : domainsChain({});
    return made[table];
  });
  return made;
}

function post(body: unknown) {
  return new Request("http://localhost/api/email-domain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authGetUserMock.mockResolvedValue({ data: { user: USER }, error: null });
  createDomainMock.mockResolvedValue({ ok: true, data: RESEND_DOMAIN });
  deleteDomainMock.mockResolvedValue({ ok: true, data: true });
  verifyDomainMock.mockResolvedValue({ ok: true, data: true });
  getDomainMock.mockResolvedValue({ ok: true, data: { ...RESEND_DOMAIN, status: "pending" } });
});

describe("POST /api/email-domain", () => {
  it("401 without a session", async () => {
    authGetUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { POST } = await import("@/src/app/api/email-domain/route");
    const res = await POST(post({ domain: "acme.com" }) as never);
    expect(res.status).toBe(401);
  });

  it("403 PLAN_GATED on the free plan and never calls Resend", async () => {
    wire({ profiles: () => profileChain("free") });
    const { POST } = await import("@/src/app/api/email-domain/route");
    const res = await POST(post({ domain: "acme.com" }) as never);
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("PLAN_GATED");
    expect(createDomainMock).not.toHaveBeenCalled();
  });

  it("400 for an email address instead of a domain", async () => {
    wire({ profiles: () => profileChain("pro") });
    const { POST } = await import("@/src/app/api/email-domain/route");
    const res = await POST(post({ domain: "hello@acme.com" }) as never);
    expect(res.status).toBe(400);
    expect(createDomainMock).not.toHaveBeenCalled();
  });

  it("409 when the user already has a domain", async () => {
    wire({
      profiles: () => profileChain("pro"),
      verified_domains: () => domainsChain({ existing: DOMAIN_ROW }),
    });
    const { POST } = await import("@/src/app/api/email-domain/route");
    const res = await POST(post({ domain: "other.com" }) as never);
    expect(res.status).toBe(409);
    expect(createDomainMock).not.toHaveBeenCalled();
  });

  it("201 on Pro: creates in Resend, stores records, returns the public view", async () => {
    const made = wire({
      profiles: () => profileChain("pro"),
      verified_domains: () =>
        domainsChain({
          existing: null,
          inserted: {
            ...DOMAIN_ROW,
            from_local_part: "news",
            dns_records: [
              { record: "SPF", name: "send", type: "MX", value: "feedback-smtp.resend.com", priority: 10, status: "not_started" },
            ],
          },
        }),
    });
    const { POST } = await import("@/src/app/api/email-domain/route");
    const res = await POST(post({ domain: "HTTPS://Mail.Acme.com/", from_local_part: "News" }) as never);
    expect(res.status).toBe(201);

    expect(createDomainMock).toHaveBeenCalledWith("mail.acme.com");
    const insertArg = made.verified_domains.insert.mock.calls[0][0];
    expect(insertArg).toMatchObject({
      user_id: "user-1",
      domain: "mail.acme.com",
      resend_domain_id: "rd-1",
      status: "pending",
      from_local_part: "news",
    });
    expect(insertArg.dns_records[0]).toMatchObject({ type: "MX", status: "not_started", priority: 10 });

    const body = await res.json();
    expect(body.domain.from_email).toBe("news@mail.acme.com");
    expect(body.domain).not.toHaveProperty("resend_domain_id");
  });

  it("502 and rolls back the Resend domain when Resend fails to create", async () => {
    createDomainMock.mockResolvedValueOnce({ ok: false, error: "boom" });
    wire({ profiles: () => profileChain("growth"), verified_domains: () => domainsChain({ existing: null }) });
    const { POST } = await import("@/src/app/api/email-domain/route");
    const res = await POST(post({ domain: "acme.com" }) as never);
    expect(res.status).toBe(502);
  });
});

describe("GET /api/email-domain", () => {
  it("reports eligibility and refreshes a pending domain from Resend", async () => {
    wire({
      profiles: () => profileChain("pro"),
      verified_domains: () => domainsChain({ existing: DOMAIN_ROW, updated: { ...DOMAIN_ROW, dns_records: [{ type: "TXT" }] } }),
    });
    const { GET } = await import("@/src/app/api/email-domain/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.eligible).toBe(true);
    expect(body.plan).toBe("pro");
    expect(getDomainMock).toHaveBeenCalledWith("rd-1");
    expect(body.domain.domain).toBe("mail.acme.com");
  });

  it("free users get eligible:false and no domain", async () => {
    wire({ profiles: () => profileChain("free"), verified_domains: () => domainsChain({ existing: null }) });
    const { GET } = await import("@/src/app/api/email-domain/route");
    const body = await (await GET()).json();
    expect(body.eligible).toBe(false);
    expect(body.domain).toBeNull();
    expect(getDomainMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/email-domain/verify", () => {
  it("404 without a domain", async () => {
    wire({ verified_domains: () => domainsChain({ existing: null }) });
    const { POST } = await import("@/src/app/api/email-domain/verify/route");
    expect((await POST()).status).toBe(404);
  });

  it("asks Resend to verify, then stores the refreshed status", async () => {
    getDomainMock.mockResolvedValueOnce({ ok: true, data: { ...RESEND_DOMAIN, status: "verified" } });
    const made = wire({
      verified_domains: () => domainsChain({ existing: DOMAIN_ROW, updated: { ...DOMAIN_ROW, status: "verified" } }),
    });
    const { POST } = await import("@/src/app/api/email-domain/verify/route");
    const res = await POST();
    expect(res.status).toBe(200);
    expect(verifyDomainMock).toHaveBeenCalledWith("rd-1");
    const updateArg = made.verified_domains!.update.mock.calls[0][0];
    expect(updateArg.status).toBe("verified");
    expect(typeof updateArg.verified_at).toBe("string");
    expect((await res.json()).domain.status).toBe("verified");
  });
});

describe("DELETE /api/email-domain", () => {
  it("removes the Resend domain and the row", async () => {
    const made = wire({ verified_domains: () => domainsChain({ existing: DOMAIN_ROW }) });
    const { DELETE } = await import("@/src/app/api/email-domain/route");
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(deleteDomainMock).toHaveBeenCalledWith("rd-1");
    expect(made.verified_domains.delete).toHaveBeenCalled();
  });
});
