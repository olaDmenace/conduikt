import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  RevisionHistoryDrawer,
  type Revision,
} from "@/src/components/generation/revision-history-drawer";

const SAMPLE_REVISIONS: Revision[] = [
  {
    id: "rev-3",
    source: "manual_edit",
    created_at: new Date(Date.now() - 30_000).toISOString(),
    content: { raw: "Latest edit" },
  },
  {
    id: "rev-2",
    source: "restore",
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
    content: { raw: "Restored an hour ago" },
  },
  {
    id: "rev-1",
    source: "generation",
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
    content: { raw: "The original generation" },
  },
];

describe("RevisionHistoryDrawer", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      // GET → return sample revisions
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ revisions: SAMPLE_REVISIONS }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the History trigger button", () => {
    render(
      <RevisionHistoryDrawer
        assetId="asset-1"
        currentContent={{ raw: "current" }}
        onRestore={() => {}}
      />
    );
    expect(
      screen.getByRole("button", { name: /open revision history/i })
    ).toBeInTheDocument();
  });

  it("fetches revisions when opened + shows them newest-first", async () => {
    render(
      <RevisionHistoryDrawer
        assetId="asset-1"
        currentContent={{ raw: "current" }}
        onRestore={() => {}}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /open revision history/i })
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/assets/asset-1/revisions")
    );
    // All three sample source labels visible
    expect(await screen.findByText("Edited")).toBeInTheDocument();
    expect(screen.getByText("Restored")).toBeInTheDocument();
    expect(screen.getByText("Generated")).toBeInTheDocument();
  });

  it("marks the newest revision as Current + hides its Restore button", async () => {
    render(
      <RevisionHistoryDrawer
        assetId="asset-1"
        currentContent={{ raw: "current" }}
        onRestore={() => {}}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /open revision history/i })
    );
    expect(await screen.findByText("Current")).toBeInTheDocument();
    // 2 of the 3 sample rows are restorable (all except the newest)
    const restoreButtons = await screen.findAllByRole("button", {
      name: /restore this version/i,
    });
    expect(restoreButtons).toHaveLength(2);
  });

  it("snapshots current content before calling onRestore", async () => {
    const onRestore = vi.fn();
    const currentContent = { raw: "current edit" };
    render(
      <RevisionHistoryDrawer
        assetId="asset-9"
        currentContent={currentContent}
        onRestore={onRestore}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /open revision history/i })
    );
    const [firstRestore] = await screen.findAllByRole("button", {
      name: /restore this version/i,
    });
    fireEvent.click(firstRestore);

    // The pre-restore snapshot POST — must be a POST with source=restore
    await waitFor(() => {
      const posts = fetchMock.mock.calls.filter(
        (c) => c[1]?.method === "POST"
      );
      expect(posts.length).toBeGreaterThanOrEqual(1);
      const body = JSON.parse(posts[0][1].body);
      expect(body.source).toBe("restore");
      expect(body.content).toEqual(currentContent);
    });

    // The older revision's content is handed back to the parent
    await waitFor(() => expect(onRestore).toHaveBeenCalledOnce());
    expect(onRestore.mock.calls[0][0]).toEqual({
      raw: "Restored an hour ago",
    });
  });

  it("closes when the X button is clicked", async () => {
    render(
      <RevisionHistoryDrawer
        assetId="asset-1"
        currentContent={{ raw: "current" }}
        onRestore={() => {}}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /open revision history/i })
    );
    await screen.findByText("Edited");
    fireEvent.click(screen.getByRole("button", { name: /close history drawer/i }));
    expect(screen.queryByText("Edited")).not.toBeInTheDocument();
  });

  it("shows an empty-state when the server returns no revisions", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ revisions: [] }),
      })
    );
    render(
      <RevisionHistoryDrawer
        assetId="asset-1"
        currentContent={{ raw: "current" }}
        onRestore={() => {}}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /open revision history/i })
    );
    expect(
      await screen.findByText(/no revisions yet/i)
    ).toBeInTheDocument();
  });
});
