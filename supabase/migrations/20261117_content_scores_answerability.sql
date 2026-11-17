-- Content scorer: a fifth dimension, "answerability" (0-100), how usable
-- the piece is as a direct answer for Google's answer features and
-- assistants. Half the model's judgement, half a deterministic check
-- (src/lib/seo/answerability.ts). Nullable so old rows stay valid.

ALTER TABLE public.content_scores
  ADD COLUMN IF NOT EXISTS answerability INTEGER
    CHECK (answerability IS NULL OR (answerability >= 0 AND answerability <= 100));
