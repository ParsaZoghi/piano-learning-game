// Note names, MIDI helpers, and layout constants shared across modules.

export const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const MIDI_MIN = 21;   // A0
export const MIDI_MAX = 108;  // C8

export const WHITE_L = 6;
export const BLACK_L = 3.8;

export const isBlack = (midi) => [1, 3, 6, 8, 10].includes(midi % 12);

export const midiToName = (midi) => NAMES[midi % 12] + (Math.floor(midi / 12) - 1);

const LETTER_TO_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Parse a note name like "C4", "F#3", "Bb5" into a MIDI number, or null. */
export function parseNoteName(name) {
  const m = /([A-G])([#b])?(-?\d)/.exec(name);
  if (!m) return null;
  const [, letter, accidental, octave] = m;
  const semitone = LETTER_TO_SEMITONE[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
  return 12 * (Number(octave) + 1) + semitone;
}
