import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PromptRecipePicker } from "@/src/components/generation/prompt-recipe-picker";

describe("PromptRecipePicker", () => {
  beforeEach(() => {
    // Silence window.confirm across tests; individual tests re-stub as needed.
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the trigger button collapsed by default", () => {
    render(<PromptRecipePicker onSelect={() => {}} />);
    expect(
      screen.getByRole("button", { name: /insert a proven prompt framework/i })
    ).toBeInTheDocument();
    // Menu items are not in the DOM before opening
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens the menu on click and lists all recipes", () => {
    render(<PromptRecipePicker onSelect={() => {}} />);
    fireEvent.click(
      screen.getByRole("button", { name: /insert a proven prompt framework/i })
    );
    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();
    // At minimum the core frameworks are visible
    expect(screen.getByText("AIDA")).toBeInTheDocument();
    expect(screen.getByText("PAS")).toBeInTheDocument();
    expect(screen.getByText(/before.*after.*bridge/i)).toBeInTheDocument();
  });

  it("calls onSelect with the picked recipe when a menu item is clicked (no existing prompt)", () => {
    const onSelect = vi.fn();
    render(<PromptRecipePicker onSelect={onSelect} />);
    fireEvent.click(
      screen.getByRole("button", { name: /insert a proven prompt framework/i })
    );
    fireEvent.click(screen.getByText("AIDA"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toEqual(
      expect.objectContaining({ id: "aida", name: "AIDA" })
    );
  });

  it("confirms before overwriting an existing prompt", () => {
    const confirmSpy = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmSpy);

    const onSelect = vi.fn();
    render(<PromptRecipePicker onSelect={onSelect} hasPrompt />);

    fireEvent.click(
      screen.getByRole("button", { name: /insert a proven prompt framework/i })
    );
    fireEvent.click(screen.getByText("PAS"));

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("does NOT call onSelect if the user cancels the overwrite confirm", () => {
    vi.stubGlobal("confirm", vi.fn(() => false));

    const onSelect = vi.fn();
    render(<PromptRecipePicker onSelect={onSelect} hasPrompt />);

    fireEvent.click(
      screen.getByRole("button", { name: /insert a proven prompt framework/i })
    );
    fireEvent.click(screen.getByText("AIDA"));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("closes the menu after a recipe is picked", () => {
    render(<PromptRecipePicker onSelect={() => {}} />);
    fireEvent.click(
      screen.getByRole("button", { name: /insert a proven prompt framework/i })
    );
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.click(screen.getByText("AIDA"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu on Escape", () => {
    render(<PromptRecipePicker onSelect={() => {}} />);
    fireEvent.click(
      screen.getByRole("button", { name: /insert a proven prompt framework/i })
    );
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
