const NEXT_COLOR = 0x4fa8ff; // next note to play
const LOOKAHEAD_COLOR = 0x1c5fa0; // notes further ahead in the current chunk
const CORRECT_COLOR = 0x38c172;
const WRONG_COLOR = 0xe3342f;
const ISOLATE_COLOR = 0xf0ad4e;

/**
 * Runs a single exercise against live note input from PianoAudio.
 *
 * - Cues the next 1-3 notes on the keyboard with fading opacity (design
 *   principle 7: model chunk-based reading rather than one note at a time).
 * - Reports per-note right/wrong feedback (principle 9: granular feedback,
 *   not just an end-of-take score).
 * - Runs the error-handling routine (principle 3): two wrong notes within
 *   the current chunk pauses forward progress, re-highlights just that
 *   chunk in amber, and requires it to be repeated correctly before the
 *   exercise continues.
 */
export class ExerciseEngine {
  constructor({ exercise, pianoAudio, highlights, lookahead = 3, onNoteResult, onSegmentIsolate, onComplete }) {
    this.exercise = exercise;
    this.pianoAudio = pianoAudio;
    this.highlights = highlights;
    this.lookahead = lookahead;
    this.onNoteResult = onNoteResult || (() => {});
    this.onSegmentIsolate = onSegmentIsolate || (() => {});
    this.onComplete = onComplete || (() => {});

    this.index = 0;
    this.segmentSize = exercise.segmentSize || 4;
    this.segmentStart = 0;
    this.errorsInSegment = 0;
    this.isolating = false;
    this.done = false;
    this.result = { correct: 0, wrong: 0, total: exercise.notes.length };

    this._unsubscribe = pianoAudio.addNoteListener((midi) => this._handleNote(midi));
    this._updateHighlights();
  }

  /** Stop listening and clear any visual cues left on the keyboard. */
  stop() {
    this._unsubscribe();
    this._clearHighlights();
  }

  _clearHighlights() {
    Object.values(this.highlights).forEach((h) => h.setState(null));
  }

  _updateHighlights() {
    this._clearHighlights();
    const { notes } = this.exercise;
    for (let i = 0; i < this.lookahead; i++) {
      const note = notes[this.index + i];
      if (!note || note.midi == null) continue;
      const opacity = Math.max(0.55 - i * 0.15, 0.12);
      this.highlights[note.midi]?.setState({ color: i === 0 ? NEXT_COLOR : LOOKAHEAD_COLOR, opacity });
    }
  }

  _flash(midi, color) {
    const h = this.highlights[midi];
    if (!h) return;
    h.setState({ color, opacity: 0.85 });
    setTimeout(() => {
      if (!this.done) this._updateHighlights();
    }, 220);
  }

  _handleNote(playedMidi) {
    if (this.done) return;
    const expected = this.exercise.notes[this.index];
    if (!expected) return;

    const isFree = expected.midi == null; // rhythm-only note: any pitch is accepted
    const correct = isFree || playedMidi === expected.midi;

    this._flash(isFree ? playedMidi : expected.midi, correct ? CORRECT_COLOR : WRONG_COLOR);
    this.onNoteResult({ index: this.index, correct, expected, playedMidi });

    if (correct) {
      this.result.correct++;
      this.errorsInSegment = 0;
      this.isolating = false;
      this.index++;

      if (this.index >= this.exercise.notes.length) {
        this._finish();
        return;
      }
      if (this.index % this.segmentSize === 0) this.segmentStart = this.index;
      this._updateHighlights();
    } else {
      this.result.wrong++;
      this.errorsInSegment++;
      if (this.errorsInSegment >= 2 && !this.isolating) {
        this._enterIsolation();
      }
    }
  }

  _enterIsolation() {
    this.isolating = true;
    this.index = this.segmentStart;
    this.errorsInSegment = 0;
    const segmentEnd = Math.min(this.segmentStart + this.segmentSize, this.exercise.notes.length);
    this.onSegmentIsolate({ segmentStart: this.segmentStart, segmentEnd });

    // Briefly wash the whole chunk amber so the isolation is visible at a glance.
    for (let i = this.segmentStart; i < segmentEnd; i++) {
      const note = this.exercise.notes[i];
      if (note?.midi != null) this.highlights[note.midi]?.setState({ color: ISOLATE_COLOR, opacity: 0.5 });
    }
    setTimeout(() => {
      if (!this.done) this._updateHighlights();
    }, 900);
  }

  _finish() {
    this.done = true;
    this._clearHighlights();
    const attempts = this.result.correct + this.result.wrong;
    const accuracy = attempts ? this.result.correct / attempts : 1;
    this.onComplete({ ...this.result, accuracy });
  }
}
