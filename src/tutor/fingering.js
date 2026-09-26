/**
 * Suggests a beginner-appropriate fingering for a note sequence with a
 * simple minimize-hand-movement rule: step up -> next finger out, step down
 * -> next finger in, and a big leap resets toward the thumb. This is the
 * established rule-of-thumb baseline (Al Kasimi et al. 2007's core idea),
 * not a full optimizer — sufficient for beginner-range material.
 */
export function suggestFingering(notes, { hand = 'right', startFinger = 1 } = {}) {
  const fingers = [];
  let finger = startFinger;
  let prevMidi = null;

  for (const note of notes) {
    if (prevMidi === null) {
      finger = startFinger;
    } else {
      const diff = note.midi - prevMidi;
      if (Math.abs(diff) > 4) {
        finger = hand === 'right' ? 1 : 5; // big leap: reset toward the thumb
      } else if (diff > 0) {
        finger = Math.min(5, finger + 1);
      } else if (diff < 0) {
        finger = Math.max(1, finger - 1);
      }
    }
    fingers.push(finger);
    prevMidi = note.midi;
  }

  return fingers;
}
