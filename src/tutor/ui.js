import { STAGES } from './curriculum.js';

const TRACK_ICON = { technique: '🎯', repertoire: '🎵', sightReading: '👁' };

/** Builds and wires the tutor panel's DOM inside `container`, driven by `session`. */
export function setupTutorUI({ session, container }) {
  container.innerHTML = `
    <div class="tutor-streak"></div>
    <div class="tutor-stage">
      <div class="tutor-stage-name"></div>
      <div class="tutor-stage-summary"></div>
      <div class="tutor-progress"><div class="tutor-progress-bar"></div></div>
      <div class="tutor-exit"></div>
    </div>
    <div class="tutor-exercises"></div>
    <label class="tutor-goal">Today's goal
      <input type="text" class="tutor-goal-input" placeholder="e.g. keep the left hand steady">
    </label>
    <div class="tutor-listen" hidden>Listen carefully, then play back what you heard…</div>
    <div class="tutor-live" hidden>
      <div class="tutor-live-label"></div>
      <div class="tutor-live-count"></div>
      <div class="tutor-finger" hidden></div>
      <div class="tutor-isolate" hidden>Let's isolate this bit — try just these notes, slowly.</div>
      <div class="tutor-log"></div>
    </div>
    <div class="tutor-result" hidden>
      <div class="tutor-result-text"></div>
      <label>What did you fix, or what will you try next time?
        <textarea class="tutor-reflection" rows="2"></textarea>
      </label>
      <button class="tutor-reflection-submit">Save reflection</button>
    </div>
    <button class="tutor-advance" hidden>Advance to next stage →</button>
  `;

  const el = (sel) => container.querySelector(sel);

  function renderStreak() {
    const { streakDays } = session.progress.state;
    const box = el('.tutor-streak');
    if (!streakDays) {
      box.textContent = 'Play today to start a practice streak.';
    } else {
      box.textContent = `🔥 ${streakDays}-day practice streak`;
    }
  }

  function renderStage() {
    const s = session.stage;
    el('.tutor-stage-name').textContent = `Stage ${s.id}: ${s.name}`;
    el('.tutor-stage-summary').textContent = s.summary;
    el('.tutor-exit').textContent = 'Exit goal: ' + s.exitCriterion;
    const { done, total } = session.stageProgress();
    el('.tutor-progress-bar').style.width = total ? `${Math.round((done / total) * 100)}%` : '100%';
    el('.tutor-advance').hidden = !session.canAdvanceStage() || s.id === STAGES.length - 1;
  }

  function renderExercises() {
    const wrap = el('.tutor-exercises');
    wrap.innerHTML = '';
    session.listExercises().forEach((ex) => {
      const btn = document.createElement('button');
      btn.className = 'tutor-ex-btn';
      btn.textContent = `${TRACK_ICON[ex.track] || ''} ${ex.label}`;
      if (!ex.generated && session.progress.isCompleted(ex.id)) btn.classList.add('done');
      btn.addEventListener('click', () => {
        const goal = el('.tutor-goal-input').value.trim();
        session.startExercise(ex.id, { goal: goal || undefined });
      });
      wrap.appendChild(btn);
    });
  }

  function updateCount(done, total) {
    el('.tutor-live-count').textContent = `${done} / ${total} notes`;
  }

  function updateFinger(note) {
    const box = el('.tutor-finger');
    if (note && note.finger != null) {
      box.hidden = false;
      box.textContent = `Suggested finger: ${note.finger}`;
    } else {
      box.hidden = true;
    }
  }

  session.onUpdate = (evt) => {
    if (evt.type === 'listen') {
      el('.tutor-listen').hidden = false;
      el('.tutor-live').hidden = true;
      el('.tutor-result').hidden = true;
    } else if (evt.type === 'start') {
      el('.tutor-listen').hidden = true;
      el('.tutor-live').hidden = false;
      el('.tutor-result').hidden = true;
      el('.tutor-isolate').hidden = true;
      el('.tutor-live-label').textContent = evt.exercise.label;
      el('.tutor-log').innerHTML = '';
      updateCount(0, evt.exercise.notes.length);
      updateFinger(evt.exercise.notes[0]);
      renderStreak();
    } else if (evt.type === 'note') {
      updateCount(evt.index + (evt.correct ? 1 : 0), session.currentExercise.notes.length);
      updateFinger(session.currentExercise.notes[evt.index + (evt.correct ? 1 : 0)]);
      const line = document.createElement('div');
      line.className = evt.correct ? 'ok' : 'bad';
      line.textContent = evt.correct ? '✓ correct' : '✗ try again';
      const log = el('.tutor-log');
      log.prepend(line);
      while (log.children.length > 6) log.removeChild(log.lastChild);
    } else if (evt.type === 'isolate') {
      const banner = el('.tutor-isolate');
      banner.hidden = false;
      clearTimeout(banner._hideTimer);
      banner._hideTimer = setTimeout(() => { banner.hidden = true; }, 2500);
    } else if (evt.type === 'complete') {
      el('.tutor-live').hidden = true;
      el('.tutor-result').hidden = false;
      const pct = Math.round(evt.result.accuracy * 100);
      el('.tutor-result-text').textContent = `Nice work — ${pct}% correct on the first pass through each note.`;
      renderStage();
      renderExercises();
    } else if (evt.type === 'stage') {
      renderStage();
      renderExercises();
    }
  };

  el('.tutor-reflection-submit').addEventListener('click', () => {
    const box = el('.tutor-reflection');
    const text = box.value.trim();
    if (!text) return;
    session.submitReflection(text);
    box.value = '';
    el('.tutor-result').hidden = true;
  });

  el('.tutor-advance').addEventListener('click', () => {
    session.advanceStage();
  });

  renderStreak();
  renderStage();
  renderExercises();
}
