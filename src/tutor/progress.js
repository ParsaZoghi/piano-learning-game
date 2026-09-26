const STORAGE_KEY = 'piano-tutor-progress-v1';

const defaultState = () => ({
  stage: 0,
  completedExercises: {}, // id -> { correct, wrong, total, accuracy, at }
  streakDays: 0,
  lastPracticeDate: null,
  goals: [], // { text, at }
  reflections: [] // { text, at }
});

/**
 * Tracks the beginner's progress through the curriculum: which stage they're
 * on, which exercises they've completed (and how well), a practice-day
 * streak, and their goal-setting/reflection notes (design principle 4).
 * Persisted to localStorage so progress survives a page reload.
 */
export class ProgressStore {
  constructor() {
    this.state = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
    } catch {
      return defaultState();
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* storage unavailable (private browsing, quota, etc.) — progress just won't persist */
    }
  }

  /** Call once per practice session to update the day-streak (principle 2/10: track engagement). */
  recordPracticeToday() {
    const today = new Date().toDateString();
    if (this.state.lastPracticeDate === today) return;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    this.state.streakDays = this.state.lastPracticeDate === yesterday ? this.state.streakDays + 1 : 1;
    this.state.lastPracticeDate = today;
    this._save();
  }

  completeExercise(id, result) {
    this.state.completedExercises[id] = { ...result, at: Date.now() };
    this._save();
  }

  isCompleted(id) {
    return Boolean(this.state.completedExercises[id]);
  }

  setStage(stage) {
    this.state.stage = stage;
    this._save();
  }

  addGoal(text) {
    this.state.goals.push({ text, at: Date.now() });
    this._save();
  }

  addReflection(text) {
    this.state.reflections.push({ text, at: Date.now() });
    this._save();
  }

  reset() {
    this.state = defaultState();
    this._save();
  }
}
