import { describe, it, expect } from "vitest";
import {
  PIPELINE_STAGES,
  PipelineStageSchema,
  MoveStageSchema,
  isPipelineStage,
  normalizeStage,
  STAGE_LABELS,
} from "@/src/lib/leads/stages";
import { bookingMessage } from "@/src/lib/leads/booking-message";

describe("pipeline stages", () => {
  it("has the five stages in pipeline order", () => {
    expect(PIPELINE_STAGES).toEqual(["new", "contacted", "qualified", "won", "lost"]);
    expect(Object.keys(STAGE_LABELS)).toEqual([...PIPELINE_STAGES]);
  });

  it("the zod enum accepts each stage and nothing else", () => {
    for (const s of PIPELINE_STAGES) expect(PipelineStageSchema.safeParse(s).success).toBe(true);
    expect(PipelineStageSchema.safeParse("closed").success).toBe(false);
    expect(PipelineStageSchema.safeParse("New").success).toBe(false);
    expect(PipelineStageSchema.safeParse(1).success).toBe(false);
  });

  it("MoveStageSchema needs a stage field", () => {
    expect(MoveStageSchema.safeParse({ stage: "won" }).success).toBe(true);
    expect(MoveStageSchema.safeParse({}).success).toBe(false);
    expect(MoveStageSchema.safeParse({ stage: "" }).success).toBe(false);
  });

  it("normalizeStage falls back to 'new' for old rows", () => {
    expect(isPipelineStage("lost")).toBe(true);
    expect(isPipelineStage(null)).toBe(false);
    expect(normalizeStage(null)).toBe("new");
    expect(normalizeStage("qualified")).toBe("qualified");
    expect(normalizeStage("archived")).toBe("new");
  });
});

describe("bookingMessage", () => {
  it("greets by first name and carries the booking link", () => {
    const msg = bookingMessage({ first_name: "Ada" }, "Lekki Dental", "https://calendly.com/lekki-dental");
    expect(msg).toBe(
      "Hi Ada, thanks for getting in touch with Lekki Dental. You can book a time that suits you here: https://calendly.com/lekki-dental"
    );
  });

  it("works without a first name", () => {
    expect(bookingMessage({ first_name: null }, "Lekki Dental", "https://wa.me/234")).toMatch(/^Hi, thanks/);
    expect(bookingMessage({}, "", "https://wa.me/234")).toContain("in touch with us.");
  });
});
