import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/src/lib/supabase/service", () => ({
  createServiceClient: () => {
    throw new Error("tests must pass a db");
  },
}));
vi.mock("@/src/lib/crypto/tokens", () => ({
  decryptToken: <T,>(v: T) => v,
  encryptToken: <T,>(v: T) => v,
  isEncryptionConfigured: () => false,
}));

import {
  publishToInstagram,
  getInstagramAccount,
  waitForContainer,
  INSTAGRAM_WAITING_MESSAGE,
} from "./instagram";

// Minimal thenable query-builder mock: every method returns the chain,
// awaiting it (or calling maybeSingle) resolves to the configured result.
function chain(result: unknown) {
  const c: Record<string, unknown> = {};
  const self = new Proxy(c, {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      return () => self;
    },
  });
  return self;
}

function dbWithFacebookAccount(account: unknown) {
  return {
    from: vi.fn((table: string) => {
      if (table === "connected_accounts") return chain({ data: account, error: null });
      return chain({ data: null, error: null });
    }),
  } as unknown as Parameters<typeof publishToInstagram>[1];
}

const json = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as Response;

const ORIGINAL_FLAG = process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION;

describe("instagram", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION = "true";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (ORIGINAL_FLAG === undefined) delete process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION;
    else process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION = ORIGINAL_FLAG;
  });

  it("is inert when the Facebook flag is off", async () => {
    process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION = "false";
    const db = dbWithFacebookAccount({ platform_user_id: "page1", access_token: "tok" });
    const acct = await getInstagramAccount({ projectId: "p", userId: "u" }, db);
    expect(acct).toEqual({ connected: false, reason: INSTAGRAM_WAITING_MESSAGE });
    const res = await publishToInstagram(
      { projectId: "p", userId: "u", caption: "x", mediaUrl: "https://i/x.jpg", mediaType: "image" },
      db
    );
    expect(res).toEqual({ ok: false, error: INSTAGRAM_WAITING_MESSAGE });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports not connected when there is no Facebook Page", async () => {
    const db = dbWithFacebookAccount(null);
    const acct = await getInstagramAccount({ projectId: "p", userId: "u" }, db);
    expect(acct.connected).toBe(false);
    if (!acct.connected) expect(acct.reason).toMatch(/Connect your Facebook Page/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("publishes an image: discover, container, publish, permalink", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ instagram_business_account: { id: "ig1", username: "shop" } }))
      .mockResolvedValueOnce(json({ id: "container1" }))
      .mockResolvedValueOnce(json({ id: "media1" }))
      .mockResolvedValueOnce(json({ permalink: "https://www.instagram.com/p/abc/" }));

    const db = dbWithFacebookAccount({ platform_user_id: "page1", access_token: "pagetok" });
    const res = await publishToInstagram(
      {
        projectId: "p",
        userId: "u",
        caption: "New arrivals",
        mediaUrl: "https://cdn/x.jpg",
        mediaType: "image",
      },
      db
    );

    expect(res).toEqual({ ok: true, externalId: "media1", permalink: "https://www.instagram.com/p/abc/" });
    expect(fetchMock).toHaveBeenCalledTimes(4);

    const [discoverUrl] = fetchMock.mock.calls[0];
    expect(String(discoverUrl)).toContain("/page1?");
    expect(String(discoverUrl)).toContain("instagram_business_account");

    const [containerUrl, containerInit] = fetchMock.mock.calls[1];
    expect(String(containerUrl)).toBe("https://graph.facebook.com/v21.0/ig1/media");
    const containerBody = JSON.parse((containerInit as RequestInit).body as string);
    expect(containerBody).toEqual({
      caption: "New arrivals",
      access_token: "pagetok",
      image_url: "https://cdn/x.jpg",
    });

    const [publishUrl, publishInit] = fetchMock.mock.calls[2];
    expect(String(publishUrl)).toBe("https://graph.facebook.com/v21.0/ig1/media_publish");
    expect(JSON.parse((publishInit as RequestInit).body as string)).toEqual({
      creation_id: "container1",
      access_token: "pagetok",
    });
  });

  it("publishes a video: polls the container until FINISHED", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ instagram_business_account: { id: "ig1" } }))
      .mockResolvedValueOnce(json({ id: "vc1" }))
      .mockResolvedValueOnce(json({ status_code: "IN_PROGRESS" }))
      .mockResolvedValueOnce(json({ status_code: "IN_PROGRESS" }))
      .mockResolvedValueOnce(json({ status_code: "FINISHED" }))
      .mockResolvedValueOnce(json({ id: "media9" }))
      .mockResolvedValueOnce(json({}, false, 500));

    const sleep = vi.fn().mockResolvedValue(undefined);
    const db = dbWithFacebookAccount({ platform_user_id: "page1", access_token: "pagetok" });
    const res = await publishToInstagram(
      { projectId: "p", userId: "u", caption: "Reel", mediaUrl: "https://cdn/x.mp4", mediaType: "video" },
      db,
      { sleep, intervalMs: 1 }
    );

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.externalId).toBe("media9");
      expect(res.permalink).toBeNull();
    }
    const containerBody = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect(containerBody.media_type).toBe("REELS");
    expect(containerBody.video_url).toBe("https://cdn/x.mp4");
    expect(sleep).toHaveBeenCalledTimes(2);
    // Three status polls happened between container creation and publish.
    expect(String(fetchMock.mock.calls[2][0])).toContain("/vc1?");
    expect(String(fetchMock.mock.calls[5][0])).toContain("/ig1/media_publish");
  });

  it("gives up on video processing after the 60 second cap", async () => {
    let t = 0;
    fetchMock.mockResolvedValue(json({ status_code: "IN_PROGRESS" }));
    await expect(
      waitForContainer("vc1", "tok", {
        now: () => t,
        sleep: async () => {
          t += 30_000;
        },
      })
    ).rejects.toThrow(/60 seconds/);
    // 0s, 30s, 60s -> three polls, then the cap triggers.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("surfaces Meta's error message when the container is rejected", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ instagram_business_account: { id: "ig1" } }))
      .mockResolvedValueOnce(json({ error: { message: "Media URL is not reachable" } }, false, 400));
    const db = dbWithFacebookAccount({ platform_user_id: "page1", access_token: "pagetok" });
    const res = await publishToInstagram(
      { projectId: "p", userId: "u", caption: "x", mediaUrl: "https://cdn/x.jpg", mediaType: "image" },
      db
    );
    expect(res).toEqual({ ok: false, error: "Media URL is not reachable" });
  });
});
