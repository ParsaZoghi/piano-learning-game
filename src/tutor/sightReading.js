/**
 * Generates a short, unfamiliar note sequence for cold sight-reading practice
 * (design principle 6: sight-reading is its own recurring track, separate
 * from repertoire). A gentle stepwise-biased random walk within a fixed
 * range keeps it playable for a beginner while still being new every time.
 */
export function generateSightReadingExercise({ range = [60, 67], length = 6, hand = 'right', segmentSize = 3 } = {}) {
  const [lo, hi] = range;
  const steps = [-2, -1, -1, 0, 1, 1, 2];
  const notes = [];
  let current = Math.round((lo + hi) / 2);

  for (let i = 0; i < length; i++) {
    const step = steps[Math.floor(Math.random() * steps.length)];
    current = Math.min(hi, Math.max(lo, current + step));
    notes.push({ midi: current, finger: null, hand });
  }

  return {
    id: `sight-${Date.now()}`,
    label: 'Sight-Reading (new each time)',
    type: 'notes',
    hand,
    segmentSize,
    notes,
    generated: true
  };
}
