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
});
