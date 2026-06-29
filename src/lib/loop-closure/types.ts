// Types shared across the loop-closure analyzer + generator hook.

export type LearningChannel = "x" | "linkedin" | "facebook" | "email";

export interface LearningEvidence {
  sampleSize: number;
  // Posts that did NOT exhibit the pattern (control group).
  controlMean: number;
  controlPostIds: string[];
  // Posts that DID exhibit the pattern (treatment group).
  treatmentMean: number;
  treatmentPostIds: string[];
  // Engagement metric the means are computed against — e.g. "raw_engagement"
  // (likes+retweets+replies) or "engagement_per_follower".
  metric: string;
  // Multiplicative lift: treatmentMean / max(controlMean, epsilon).
  lift: number;
}

export interface Learning {
  patternKey: string;
  hypothesis: string;
  evidence: LearningEvidence;
  confidence: number;
}

export interface AnalyzerResult {
  learnings: Learning[];
  postsConsidered: number;
  rangeStart: string;
  rangeEnd: string;
  modelInputTokens: number;
  modelOutputTokens: number;
}
