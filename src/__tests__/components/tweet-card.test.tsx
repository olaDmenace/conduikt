import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TweetCard } from "@/src/components/social/tweet-card";

describe("TweetCard", () => {
  it("renders the tweet text", () => {
    render(<TweetCard text="Hello, world" />);
    expect(screen.getByText("Hello, world")).toBeInTheDocument();
  });

  it("uses the default author when none supplied", () => {
    render(<TweetCard text="hi" />);
    expect(screen.getByText("Your Name")).toBeInTheDocument();
    expect(screen.getByText("@yourhandle")).toBeInTheDocument();
  });

  it("shows an italic empty-state hint when text is blank", () => {
    render(<TweetCard text="" />);
    expect(
      screen.getByText(/your tweet will appear here/i)
    ).toBeInTheDocument();
  });

  it("shows the remaining-character counter only in warning / over-limit zone", () => {
    // 100 chars — well within limit, no counter
    const { rerender } = render(<TweetCard text={"a".repeat(100)} />);
    expect(screen.queryByText(/^\-?\d+$/)).not.toBeInTheDocument();

    // 270 chars — warning zone, counter appears (10 remaining)
    rerender(<TweetCard text={"a".repeat(270)} />);
    expect(screen.getByText("10")).toBeInTheDocument();

    // 300 chars — over limit, counter shows negative
    rerender(<TweetCard text={"a".repeat(300)} />);
    expect(screen.getByText("-20")).toBeInTheDocument();
  });

  it("renders the position marker when part of a thread", () => {
    render(
      <TweetCard
        text="first tweet"
        thread
        position={{ current: 1, total: 4 }}
      />
    );
    expect(screen.getByText("1/4")).toBeInTheDocument();
  });

  it("renders custom author details", () => {
    render(
      <TweetCard
        text="hi"
        author={{ name: "Ada Lovelace", handle: "ada", verified: true }}
      />
    );
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("@ada")).toBeInTheDocument();
    expect(screen.getByLabelText("Verified")).toBeInTheDocument();
  });

  it("renders media placeholders when mediaCount > 0", () => {
    render(<TweetCard text="hi" mediaCount={2} />);
    expect(screen.getByText("Media 1")).toBeInTheDocument();
    expect(screen.getByText("Media 2")).toBeInTheDocument();
  });

  it("caps media placeholders at 4", () => {
    render(<TweetCard text="hi" mediaCount={7} />);
    expect(screen.getByText("Media 4")).toBeInTheDocument();
    expect(screen.queryByText("Media 5")).not.toBeInTheDocument();
  });

  it("counts multi-byte characters via Array.from length", () => {
    // A single emoji is one Unicode code point via Array.from
    // (matches the counter behaviour of the component, not twitter-text)
    render(<TweetCard text={"🚀".repeat(275)} />);
    // 275 code points → 5 remaining → in warning band
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────
  // Edge cases hit by the Content Studio + Calendar integrations
  // ────────────────────────────────────────────────────────────

  it("preserves newlines in the tweet body (whitespace-pre-wrap)", () => {
    // The SocialPostCard integration replaces a plain <p whitespace-pre-line>
    // with the native card; parity requires newlines to render.
    const multiline = "line one\n\nline three";
    render(<TweetCard text={multiline} />);
    // Match the specific <p> holding the body — the outer article's
    // textContent will also include icon accessible labels, so the
    // element-type gate is what makes the assertion robust.
    const body = screen.getByText((_, node) => {
      return node?.tagName === "P" && node?.textContent === multiline;
    });
    expect(body).toBeInTheDocument();
    expect(body.className).toContain("whitespace-pre-wrap");
  });

  it("handles a URL-heavy tweet without truncating in the counter", () => {
    const withUrl =
      "Just shipped Conduikt v2 — check it out at https://conduikt.com/launch";
    render(<TweetCard text={withUrl} />);
    // Component counts every character (no url shortening). Well under
    // limit — no counter shown.
    expect(screen.queryByText(/^-?\d+$/)).not.toBeInTheDocument();
    expect(screen.getByText(withUrl)).toBeInTheDocument();
  });

  it("renders way-over-limit tweets without crashing (thread-generating case)", () => {
    // The Content Studio auto-threads X posts over 280 chars via
    // ThreadPreview — TweetCard still renders the raw content in that
    // state so users see what got over. Verify counter shows negative,
    // ring visually saturated (not asserted; smoke render check).
    const massive = "a".repeat(1500);
    render(<TweetCard text={massive} />);
    // Remaining = 280 - 1500 = -1220
    expect(screen.getByText("-1220")).toBeInTheDocument();
  });

  it("shows correct media placeholder count for the [0, 1, 2, 3, 4] range", () => {
    for (const n of [0, 1, 2, 3, 4]) {
      const { unmount } = render(<TweetCard text="hi" mediaCount={n} />);
      if (n === 0) {
        expect(screen.queryByText(/^Media 1$/)).not.toBeInTheDocument();
      } else {
        expect(screen.getByText(`Media ${n}`)).toBeInTheDocument();
      }
      unmount();
    }
  });

  it("does not render a verified badge unless author.verified is true", () => {
    // Regression guard: earlier renderers sometimes leaked the icon on
    // undefined-verified. Cover the both branches.
    const { rerender } = render(
      <TweetCard text="hi" author={{ name: "Ada", handle: "ada" }} />
    );
    expect(screen.queryByLabelText("Verified")).not.toBeInTheDocument();

    rerender(
      <TweetCard
        text="hi"
        author={{ name: "Ada", handle: "ada", verified: false }}
      />
    );
    expect(screen.queryByLabelText("Verified")).not.toBeInTheDocument();

    rerender(
      <TweetCard
        text="hi"
        author={{ name: "Ada", handle: "ada", verified: true }}
      />
    );
    expect(screen.getByLabelText("Verified")).toBeInTheDocument();
  });
});
