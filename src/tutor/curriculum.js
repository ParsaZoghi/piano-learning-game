// The beginner learning path, as designed in the planning document:
// Stage 0 Orientation -> 1 Five-Finger Foundations -> 2 Hands Together ->
// 3 Sight-Reading Track -> 4 Structured Practice Habits -> 5 Expanding Repertoire.
//
// Each stage carries three tracks (technique / repertoire / sight-reading),
// per design principle 1 ("treat these as separate practice tracks").
// Content here is illustrative for each stage, not exhaustive — the engine
// and data shape are built to make adding more exercises later a one-line
// change (push another object into a track's array).
//
// Exercise note shape: { midi, finger, hand }
//   - midi: MIDI note number, or null for a "free" note (any pitch accepted —
//     used for rhythm-only drills, where only timing/order matters).
//   - finger: suggested finger 1-5, or null if not applicable.
//   - hand: 'left' | 'right' | 'both' | 'either' (informational, for the UI).

const rhFiveFinger = [60, 62, 64, 65, 67, 65, 64, 62, 60];
const rhFingering = [1, 2, 3, 4, 5, 4, 3, 2, 1];
const lhFiveFinger = [48, 50, 52, 53, 55, 53, 52, 50, 48];
const lhFingering = [5, 4, 3, 2, 1, 2, 3, 4, 5];

export const STAGES = [
  {
    id: 0,
    name: 'Orientation',
    summary: 'Find your way around the keyboard and start listening actively, before any notation.',
    exitCriterion: 'Find any named white key within a few seconds, without counting from a fixed edge.',
    tracks: {
      technique: [
        {
          id: 's0-keyfinding',
          label: 'Key Finding',
          type: 'keyfinding',
          hand: 'either',
          segmentSize: 4,
          notes: [60, 65, 55, 67, 62, 48, 64, 57].map((midi) => ({ midi, finger: null, hand: 'either' }))
        }
      ],
      repertoire: [],
      sightReading: null
    }
  },
  {
    id: 1,
    name: 'Five-Finger Foundations',
    summary: 'Single-hand five-finger patterns, paired with simple rhythm reading.',
    exitCriterion:
      'Play a short five-finger piece hands separately with correct rhythm, and describe what you fixed after a mistake.',
    tracks: {
      technique: [
        {
          id: 's1-rh-five-finger',
          label: 'Right Hand: C Position',
          type: 'notes',
          hand: 'right',
          segmentSize: 3,
          notes: rhFiveFinger.map((midi, i) => ({ midi, finger: rhFingering[i], hand: 'right' }))
        },
        {
          id: 's1-lh-five-finger',
          label: 'Left Hand: C Position',
          type: 'notes',
          hand: 'left',
          segmentSize: 3,
          notes: lhFiveFinger.map((midi, i) => ({ midi, finger: lhFingering[i], hand: 'left' }))
        }
      ],
      repertoire: [
        {
          id: 's1-rhythm-piece',
          label: 'Rhythm Reading (one key, focus on timing)',
          type: 'rhythm',
          hand: 'either',
          segmentSize: 4,
          notes: [67, 67, 67, 67, 67, 67].map((midi) => ({ midi, finger: null, hand: 'either' }))
        }
      ],
      sightReading: null
    }
  },
  {
    id: 2,
    name: 'Hands Together & Basic Technique',
    summary: 'Combine both hands, and start a dedicated technique warm-up separate from piece practice.',
    exitCriterion: 'Play a short hands-together piece at a slow, steady tempo with few errors.',
    tracks: {
      technique: [
        {
          id: 's2-scale-warmup',
          label: 'C Position Warm-Up',
          type: 'notes',
          hand: 'right',
          segmentSize: 5,
          notes: rhFiveFinger.map((midi, i) => ({ midi, finger: rhFingering[i], hand: 'right' }))
        }
      ],
      repertoire: [
        {
          id: 's2-hands-together',
          label: '"Merrily We Roll Along" (simplified, RH)',
          type: 'notes',
          hand: 'right',
          segmentSize: 4,
          notes: [64, 62, 60, 62, 64, 64, 64].map((midi) => ({ midi, finger: null, hand: 'right' }))
        }
      ],
      sightReading: null
    }
  },
  {
    id: 3,
    name: 'Sight-Reading Track Begins',
    summary: 'Cold-read short, unfamiliar patterns every session — separate from repertoire practice.',
    exitCriterion: 'Sight-read a piece about one level below your repertoire with reasonable first-attempt accuracy.',
    tracks: {
      technique: [],
      repertoire: [],
      sightReading: { range: [60, 67], length: 6, hand: 'right', segmentSize: 3 }
    }
  },
  {
    id: 4,
    name: 'Structured Practice Habits',
    summary: 'Warm-up, repertoire, sight-reading, and a short mental-practice drill — every session.',
    exitCriterion: 'Propose a specific, well-formed goal for a practice segment on your own.',
    tracks: {
      technique: [
        {
          id: 's4-audiation',
          label: 'Audiation: Hear It, Then Play It',
          type: 'audiation',
          hand: 'right',
          segmentSize: 5,
          notes: [60, 64, 67, 64, 60].map((midi) => ({ midi, finger: null, hand: 'right' }))
        }
      ],
      repertoire: [],
      sightReading: { range: [59, 69], length: 7, hand: 'right', segmentSize: 3 }
    }
  },
  {
    id: 5,
    name: 'Expanding Beginner Repertoire',
    summary:
      'Broader key signatures and hand positions within the beginner range. The Stage 4 session template ' +
      'becomes your steady-state practice structure from here on — extend this stage with more pieces over time.',
    exitCriterion: 'Ongoing — no single exit point; keep cycling technique / repertoire / sight-reading.',
    tracks: {
      technique: [],
      repertoire: [],
      sightReading: { range: [57, 72], length: 8, hand: 'right', segmentSize: 4 }
    }
  }
];
