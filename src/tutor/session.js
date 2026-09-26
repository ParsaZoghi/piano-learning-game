import { STAGES } from './curriculum.js';
import { ExerciseEngine } from './exerciseEngine.js';
import { generateSightReadingExercise } from './sightReading.js';

/**
 * Ties the curriculum, the exercise engine, and the progress store together.
 * The UI drives this through startExercise/submitReflection/advanceStage and
 * listens to onUpdate for what to render.
 */
export class PracticeSession {
  constructor({ pianoAudio, highlights, progress }) {
    this.pianoAudio = pianoAudio;
    this.highlights = highlights;
    this.progress = progress;
    this.onUpdate = () => {};
    this.engine = null;
    this.currentExercise = null;
  }

  get stage() {
    return STAGES[this.progress.state.stage] || STAGES[STAGES.length - 1];
  }

  /** All selectable exercises for the current stage, technique + repertoire + one sight-reading slot. */
  listExercises() {
    const s = this.stage;
    const list = [
      ...s.tracks.technique.map((e) => ({ ...e, track: 'technique' })),
      ...s.tracks.repertoire.map((e) => ({ ...e, track: 'repertoire' }))
    ];
    if (s.tracks.sightReading) {
      list.push({ id: `sight-${s.id}`, label: 'Sight-Reading (new each time)', track: 'sightReading', generated: true });
    }
    return list;
  }

  startExercise(exerciseId, { goal } = {}) {
    const s = this.stage;
    let exercise;

    if (exerciseId.startsWith('sight-')) {
      exercise = generateSightReadingExercise(s.tracks.sightReading);
    } else {
      exercise = [...s.tracks.technique, ...s.tracks.repertoire].find((e) => e.id === exerciseId);
    }
    if (!exercise) return null;

    if (goal) this.progress.addGoal(goal);

    this.currentExercise = exercise;
    this.progress.recordPracticeToday();
    this.engine?.stop();

    if (exercise.type === 'audiation') {
      // Design principle 8: play the phrase first (listen), then ask for it
      // back from memory — the engine only starts listening once playback ends.
      this.onUpdate({ type: 'listen', exercise });
      this._playbackAudiation(exercise).then(() => this._beginEngine(exercise));
      return null; // engine isn't ready yet; UI should wait for the 'start' event
    }

    return this._beginEngine(exercise);
  }

  /** Plays a phrase back audibly (and visually, via the real keys) for a mental-practice drill. */
  async _playbackAudiation(exercise) {
    const gap = 420;
    for (const note of exercise.notes) {
      if (note.midi == null) continue;
      this.pianoAudio.noteOn(note.midi, 0.55);
      await new Promise((resolve) => setTimeout(resolve, gap * 0.7));
      this.pianoAudio.noteOff(note.midi);
      await new Promise((resolve) => setTimeout(resolve, gap * 0.3));
    }
  }

  _beginEngine(exercise) {
    this.engine = new ExerciseEngine({
      exercise,
      pianoAudio: this.pianoAudio,
      highlights: this.highlights,
      onNoteResult: (r) => this.onUpdate({ type: 'note', ...r }),
      onSegmentIsolate: (seg) => this.onUpdate({ type: 'isolate', ...seg }),
      onComplete: (result) => this._finishExercise(exercise, result)
    });
    this.onUpdate({ type: 'start', exercise });
    return this.engine;
  }

  _finishExercise(exercise, result) {
    // Generated sight-reading exercises get a fresh id each time by design, so
    // they're never marked "done" the way a fixed piece is — that's intentional.
    if (!exercise.generated) this.progress.completeExercise(exercise.id, result);
    this.onUpdate({ type: 'complete', exercise, result });
  }

  submitReflection(text) {
    this.progress.addReflection(text);
    this.onUpdate({ type: 'reflection', text });
  }

  /** Fixed (non-generated) exercises completed vs. total, for a stage progress bar. */
  stageProgress() {
    const list = this.listExercises().filter((e) => !e.generated);
    const done = list.filter((e) => this.progress.isCompleted(e.id)).length;
    return { done, total: list.length };
  }

  canAdvanceStage() {
    const { done, total } = this.stageProgress();
    return total === 0 || done >= total;
  }

  advanceStage() {
    if (!this.canAdvanceStage()) return false;
    const next = Math.min(this.progress.state.stage + 1, STAGES.length - 1);
    this.progress.setStage(next);
    this.onUpdate({ type: 'stage', stage: next });
    return true;
  }
}
