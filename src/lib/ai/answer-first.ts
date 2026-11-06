// Shared writing rules that make a page or post usable as a direct answer:
// by Google's answer features, by assistants such as ChatGPT and Perplexity,
// and by a person skimming. Appended to the system prompts of the agents
// that write pages and articles. Plain rules, no acronyms: the UI calls this
// "ready for Google and AI answers".

export const ANSWER_FIRST_RULES = `
## Answer-first rules (always apply)
- Open with the answer. The first two sentences under the main heading answer the question the page exists for, in plain words, before any background.
- One sentence near the top says plainly who the business is, what it does and where it works (for example "Brightline Cleaning is a house and office cleaning service in Lekki, Lagos"). Use the facts given; never invent a location, price, award or number.
- Make headings the questions people actually ask ("How much does a deep clean cost?") or short plain noun phrases. Each section must still make sense if lifted out of the page on its own.
- Include a short FAQ (3 to 5 questions) with two-sentence answers that repeat the key fact in the answer itself.
- Give every claim a source or a date when one is available in the facts provided; otherwise state it as the business's own experience, not as a statistic.
- Use the business's name and the same spelling of its services throughout. No synonyms for the service name, no pronoun-only references.
- Keep sentences under 20 words where possible. No emojis. No exclamation marks. No filler introductions.
`;
