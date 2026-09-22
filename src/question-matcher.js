// A shared descriptor-conditioned head. No descriptor IDs or fixed label outputs enter scoring.
export const featureNames = ['questionSimilarity', 'definitionSimilarity', 'bestExample', 'secondExample', 'meanExample', 'bestNonAnswer', 'positiveMargin', 'definitionMargin', 'questionMargin', 'exampleSpread'];
const dot = (a, b) => { if (a.length !== b.length) throw new Error('Embedding dimensions do not match.'); let sum = 0; for (let i = 0; i < a.length; i++) sum += a[i] * b[i]; return sum; };
export function matchFeatures(vector, profile) {
  const positives = profile.vectors.examples.map(v => dot(vector, v)).sort((a, b) => b - a);
  const negative = Math.max(...profile.vectors.nonAnswers.map(v => dot(vector, v)));
  const question = dot(vector, profile.vectors.question), definition = dot(vector, profile.vectors.definition);
  const best = positives[0], second = positives[1] ?? best, mean = positives.reduce((a, b) => a + b, 0) / positives.length;
  return [question, definition, best, second, mean, negative, best - negative, definition - negative, question - negative, best - second];
}
export function matchScore(features, model) {
  const z = model.weights.reduce((value, weight, i) => value + weight * (features[i] - model.mean[i]) / model.scale[i], model.bias);
  return 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, z))));
}
export function answerQuestions(spans, vectors, profiles, model) {
  return profiles.map(profile => {
    let confidence = 0, evidence = '';
    vectors.forEach((vector, i) => { const score = matchScore(matchFeatures(vector, profile), model); if (score > confidence) { confidence = score; evidence = spans[i]; } });
    const detected = confidence >= model.threshold;
    return { id: profile.id, name: profile.name, question: profile.question, detected, confidence, evidence: detected ? evidence : null, answer: detected ? evidence : null };
  });
}
