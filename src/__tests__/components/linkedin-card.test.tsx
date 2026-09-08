import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LinkedInCard } from "@/src/components/social/linkedin-card";

describe("LinkedInCard", () => {
  it("renders the post text", () => {
    render(<LinkedInCard text="Just shipped a real thing today." />);
    expect(
      screen.getByText(/just shipped a real thing today/i)
    ).toBeInTheDocument();
  });

  it("uses the default author when none supplied", () => {
    render(<LinkedInCard text="hi" />);
    expect(screen.getByText("Your Name")).toBeInTheDocument();
    expect(screen.getByText("Founder · Conduikt")).toBeInTheDocument();
  });

  it("shows an italic empty-state hint when text is blank", () => {
    render(<LinkedInCard text="" />);
    expect(
      screen.getByText(/your linkedin post will appear here/i)
    ).toBeInTheDocument();
  });

  it("does not show see-more when text is under the fold", () => {
    render(<LinkedInCard text={"a".repeat(200)} />);
    expect(screen.queryByText(/see more/i)).not.toBeInTheDocument();
  });

  it("shows see-more affordance when text is over the fold", () => {
    const long = "a".repeat(400);
    render(<LinkedInCard text={long} />);
    expect(screen.getByRole("button", { name: /see more/i })).toBeInTheDocument();
    // Fold-warning message present
    expect(
      screen.getByText(/feed shows first 210/i)
    ).toBeInTheDocument();
  });

  it("expands when see-more is clicked", () => {
    const long = "a".repeat(400);
    render(<LinkedInCard text={long} />);
    const seeMore = screen.getByRole("button", { name: /see more/i });
    fireEvent.click(seeMore);
    // After expand, the see-more button disappears
    expect(screen.queryByRole("button", { name: /see more/i })).not.toBeInTheDocument();
  });

  it("always shows character count", () => {
    render(<LinkedInCard text={"a".repeat(150)} />);
    expect(screen.getByText("150 characters")).toBeInTheDocument();
  });

  it("renders media placeholders when mediaCount > 0", () => {
    render(<LinkedInCard text="hi" mediaCount={1} />);
    expect(screen.getByText("Media 1")).toBeInTheDocument();
  });

  it("caps media placeholders at 4", () => {
    render(<LinkedInCard text="hi" mediaCount={10} />);
    expect(screen.getByText("Media 4")).toBeInTheDocument();
    expect(screen.queryByText("Media 5")).not.toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────
  // Edge cases hit by the Content Studio + Calendar integrations
  // ────────────────────────────────────────────────────────────

  it("preserves newlines in the post body (whitespace-pre-wrap)", () => {
    // Users write multi-line LinkedIn posts by convention; parity with
    // the previous plain-<p> renderer requires newlines to survive.
    const multiline = "Big announcement\n\nWe just shipped X.\n\nHere's why:";
    render(<LinkedInCard text={multiline} />);
    // Target the <p> that actually holds the message body — the outer
    // article's textContent also includes character-count + reaction
    // labels, so we must be specific about the element type.
    const body = screen.getByText((_, node) => {
      return (
        node?.tagName === "P" && node?.textContent === multiline
      );
    });
    expect(body).toBeInTheDocument();
    expect(body.className).toContain("whitespace-pre-wrap");
  });

  it("renders very long text (thousands of chars) without crashing", () => {
    // LinkedIn's true hard limit is ~3000 chars but the fold at 210 is
    // the more meaningful UI beat. Confirm long text folds AND the
    // full char count reports correctly.
    const huge = "a".repeat(2800);
    render(<LinkedInCard text={huge} />);
    expect(screen.getByRole("button", { name: /see more/i })).toBeInTheDocument();
    expect(screen.getByText("2800 characters")).toBeInTheDocument();
  });

  it("expands to full text after clicking see-more", () => {
    // Repeat of an earlier case but with an assertion on the expanded
    // content length matching, not just the button vanishing.
    const long = "hello world ".repeat(30); // ~360 chars
    render(<LinkedInCard text={long} />);
    fireEvent.click(screen.getByRole("button", { name: /see more/i }));
    // Full text now visible somewhere in the DOM
    const bodies = screen.getAllByText((_, node) =>
      Boolean(node?.textContent?.includes(long.trim()))
    );
    expect(bodies.length).toBeGreaterThan(0);
  });

  it("handles an author with no headline gracefully", () => {
    render(
      <LinkedInCard text="hi" author={{ name: "Ada Lovelace" }} />
    );
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    // No default headline should be injected when caller omits it
    expect(screen.queryByText("Founder · Conduikt")).not.toBeInTheDocument();
  });

  it("renders reaction bar buttons disabled (preview-only)", () => {
    // Sanity check that the interaction row never accidentally becomes
    // actionable — this component only previews.
    render(<LinkedInCard text="hi" />);
    for (const label of ["Like", "Comment", "Repost", "Send"]) {
      const btn = screen.getByLabelText(new RegExp(`${label} .preview only.`, "i"));
      expect(btn).toBeDisabled();
    }
  });
});
