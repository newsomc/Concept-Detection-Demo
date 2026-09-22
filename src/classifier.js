// The encoder understands language; this supervised head learns our 16 labels.
export const sigmoid = x => 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, x))));
export function scoreEmbedding(vector, head) {
  return head.weights.map((weights, i) => sigmoid(weights.reduce((v, w, j) => v + w * vector[j], head.bias[i])));
}
export function splitText(text) {
  // Classify full sentences and their clauses: one sentence can supply many details.
  // These are generic language boundaries, not rules assigning product labels.
  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
  const candidates = [];
  for (const line of text.split(/\n+/)) for (const { segment } of segmenter.segment(line)) {
    const sentence = segment.trim();
    const spans = [sentence];
    // Do not detach affirmative-looking fragments from a question.
    if (!sentence.includes('?')) {
      const clauses = [];
      for (const piece of sentence.split(/,(?!\d)|;/)) {
        const clause = piece.trim();
        // Keep short list items attached to their context (e.g. a list of decor styles).
        const wordCount = clause.replace(/^(?:and|or)\s+/i, '').split(/\s+/).length;
        if (wordCount <= 3 && clauses.length) clauses[clauses.length - 1] += ', ' + clause;
        else clauses.push(clause);
      }
      spans.push(...clauses.filter(s => s.split(/\s+/).length >= 3));
      for (const clause of [sentence, ...clauses]) {
        const parts = clause.split(/\s+(?:and|but)\s+/i).map(s => s.trim());
        // Splitting short noun lists strips necessary context; split substantive clauses only.
        if (parts.length > 1 && parts.every(s => s.split(/\s+/).length >= 4)) spans.push(...parts);
      }
    }
    for (const span of spans) {
      const words = span.split(/\s+/).filter(Boolean);
      for (let i = 0; i < words.length; i += 48) candidates.push(words.slice(i, i + 64).join(' '));
    }
  }
  return [...new Set(candidates)].filter(Boolean);
}
export function aggregate(segments, scores, head) {
  return head.labels.map((name, k) => {
    let best = -1, confidence = 0;
    scores.forEach((row, i) => { if (row[k] > confidence) { confidence = row[k]; best = i; } });
    return { name, detected: confidence >= head.thresholds[k], confidence, evidence: best < 0 ? '' : segments[best] };
  });
}
