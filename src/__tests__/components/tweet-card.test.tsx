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
});
