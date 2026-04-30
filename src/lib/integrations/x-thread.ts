// Splits long text into a sequence of tweet-sized chunks suitable for posting
// as a single tweet (when short) or a reply-chained thread (when long).
//
// Strategy:
//   1. If the whole text fits in 280 chars, post it as one tweet — no split.
//   2. Otherwise prefer paragraph boundaries (blank-line separated): each
//      paragraph becomes its own tweet.
//   3. If a single paragraph still exceeds 280, split it on sentence
//      boundaries (. ! ?) and greedily pack sentences into chunks.
//   4. If a single sentence exceeds 280, fall back to word boundaries.
//   5. Last-resort hard chop for the (extreme) case of a single token > 280.
//
// We never insert "1/N" markers — modern X threads read better without them.

const X_HARD_LIMIT = 280;
const PACK_TARGET = 270; // small buffer so emoji/grapheme counting quirks don't bite

export function splitForX(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= X_HARD_LIMIT) return [trimmed];

  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length <= 1) {
    return splitParagraph(trimmed);
  }

  const chunks: string[] = [];
  for (const para of paragraphs) {
    if (para.length <= X_HARD_LIMIT) {
      chunks.push(para);
    } else {
      chunks.push(...splitParagraph(para));
    }
  }
  return chunks;
}

function splitParagraph(para: string): string[] {
  const sentences = para
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (sentence.length > X_HARD_LIMIT) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...splitByWords(sentence));
      continue;
    }

    const tentative = current ? `${current} ${sentence}` : sentence;
    if (tentative.length <= PACK_TARGET) {
      current = tentative;
    } else {
      if (current) chunks.push(current);
      current = sentence;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function splitByWords(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > X_HARD_LIMIT) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += X_HARD_LIMIT) {
        chunks.push(word.slice(i, i + X_HARD_LIMIT));
      }
      continue;
    }

    const tentative = current ? `${current} ${word}` : word;
    if (tentative.length <= PACK_TARGET) {
      current = tentative;
    } else {
      if (current) chunks.push(current);
      current = word;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}
