import { todayKey, addDays } from '../src/lib/dates'
import {
  gradeCard, isMature, knownCard, buildQueue, requeue, newCard,
  INITIAL_EASE, MIN_EASE, MATURE_INTERVAL_DAYS, MAX_INTERVAL_DAYS, RELEARN_GAP,
  EASE_RECOVERY_AFTER_REPS, type SrsDeck,
} from '../src/lib/srs'
import { mergeSrsDecks } from '../src/lib/sync'

let fails = 0
function check(label: string, ok: boolean, detail = '') {
  if (!ok) { fails++; console.log(`FAIL  ${label}${detail ? ' :: ' + detail : ''}`) }
  else console.log(`ok    ${label}${detail ? ' :: ' + detail : ''}`)
}

const D = (s: string) => new Date(`${s}T12:00:00`)
const T = '2026-08-24'

// --- dates ---
check('addDays across month', addDays('2026-08-31', 1) === '2026-09-01', addDays('2026-08-31', 1))
check('addDays across year', addDays('2026-12-31', 1) === '2027-01-01', addDays('2026-12-31', 1))
check('addDays leap 2028', addDays('2028-02-28', 1) === '2028-02-29', addDays('2028-02-28', 1))
check('addDays DST spring-forward', addDays('2026-03-07', 1) === '2026-03-08', addDays('2026-03-07', 1))
check('due strings sort chronologically', '2026-09-01' > '2026-08-31' && '2027-01-01' > '2026-12-31')

// --- scheduling ---
let c = gradeCard(undefined, true, D(T))
check('1st pass -> interval 1', c.interval === 1 && c.due === addDays(T, 1), `i=${c.interval} due=${c.due}`)
check('1st pass -> ease unchanged 2.5', c.ease === INITIAL_EASE, String(c.ease))
check('1st pass -> introduced today', c.introduced === T)
c = gradeCard(c, true, D(T))
check('2nd pass -> interval 6', c.interval === 6, String(c.interval))
c = gradeCard(c, true, D(T))
check('3rd pass -> round(6*2.5)=15', c.interval === 15, String(c.interval))
check('3rd pass -> ease healed but capped at 2.5', c.ease === INITIAL_EASE, String(c.ease))

// lapse
const lapsed = gradeCard(c, false, D(T))
check('fail -> interval 0, due today, reps 0', lapsed.interval === 0 && lapsed.due === T && lapsed.reps === 0)
check('fail after graduation -> lapses 1', lapsed.lapses === 1, String(lapsed.lapses))
check('fail -> ease 2.5 -> 1.96', Math.abs(lapsed.ease - 1.96) < 1e-9, String(lapsed.ease))
const freshFail = gradeCard(undefined, false, D(T))
check('fail on brand-new card does NOT count a lapse', freshFail.lapses === 0, String(freshFail.lapses))

// ease floor
let e = newCard(T)
for (let i = 0; i < 8; i++) e = gradeCard(e, false, D(T))
check('repeated fails clamp ease at 1.3 exactly', e.ease === MIN_EASE, String(e.ease))

// ease recovery never exceeds initial
let r = newCard(T)
for (let i = 0; i < 20; i++) r = gradeCard(r, true, D(T))
check('20 passes: ease never exceeds 2.5', r.ease <= INITIAL_EASE, String(r.ease))
check('20 passes: interval never exceeds the ceiling', r.interval === MAX_INTERVAL_DAYS, String(r.interval))

// --- interval ceiling ---
const atCap = gradeCard({ ...newCard(T), interval: MAX_INTERVAL_DAYS, reps: 5 }, true, D(T))
check('pass at the ceiling stays at the ceiling', atCap.interval === MAX_INTERVAL_DAYS, String(atCap.interval))
check('pass at the ceiling schedules the ceiling out', atCap.due === addDays(T, MAX_INTERVAL_DAYS), atCap.due)
const overCap = gradeCard({ ...newCard(T), interval: 400, reps: 9 }, true, D(T))
check('a legacy over-cap interval clamps on its next pass', overCap.interval === MAX_INTERVAL_DAYS, String(overCap.interval))
check('ceiling does not disturb the early steps', gradeCard(undefined, true, D(T)).interval === 1)

// monotonic growth
let g = newCard(T); const seq: number[] = []
for (let i = 0; i < 8; i++) { g = gradeCard(g, true, D(T)); seq.push(g.interval) }
check('intervals grow monotonically', seq.every((v, i) => i === 0 || v >= seq[i - 1]), seq.join(','))

// maturity
check('isMature false below 21d', !isMature({ ...newCard(T), interval: 20 }))
check('isMature true at 21d', isMature({ ...newCard(T), interval: MATURE_INTERVAL_DAYS }))
check('isMature false for undefined', !isMature(undefined))
check('lapse un-matures', !isMature(gradeCard({ ...newCard(T), interval: 30, reps: 5 }, false, D(T))))

// --- "I already know this" ---
const k = knownCard(undefined, D(T))
check('knownCard is mature at once', isMature(k), String(k.interval))
check('knownCard sits at the ceiling', k.interval === MAX_INTERVAL_DAYS, String(k.interval))
check('knownCard is due the ceiling out, not today', k.due === addDays(T, MAX_INTERVAL_DAYS), k.due)
check('knownCard carries a streak, so buildQueue reads it as a review', k.reps >= EASE_RECOVERY_AFTER_REPS, String(k.reps))
const kPassed = gradeCard(k, true, D(addDays(T, MAX_INTERVAL_DAYS)))
check('passing a known card keeps it at the ceiling', kPassed.interval === MAX_INTERVAL_DAYS, String(kPassed.interval))
const kFailed = gradeCard(k, false, D(T))
check('failing a known card un-knows it', !isMature(kFailed) && kFailed.due === T, `i=${kFailed.interval} due=${kFailed.due}`)
const kPrior = knownCard({ ...newCard('2026-08-01'), ease: 1.8, reps: 2, lapses: 3 }, D(T))
check('knownCard keeps a prior card ease/introduced/lapses', kPrior.ease === 1.8 && kPrior.introduced === '2026-08-01' && kPrior.lapses === 3, JSON.stringify(kPrior))

// --- queue ---
const lemmas = [
  { lemma: 'alpha', freq: 100 }, { lemma: 'beta', freq: 90 }, { lemma: 'gamma', freq: 80 },
  { lemma: 'delta', freq: 70 }, { lemma: 'eps', freq: 60 },
]
const known = new Set<string>(['alpha'])     // hand-marked "I already know this"
const deck: SrsDeck = {
  gamma: { ...newCard('2026-08-20'), due: '2026-08-20', reps: 3, interval: 5, reviewed: 5 },
  delta: { ...newCard('2026-08-22'), due: '2026-08-22', reps: 0, interval: 0, reviewed: 9 },
}
const q = buildQueue(lemmas, known, deck, 10, 1, T)
check('due cards come before new', q.queue.slice(0, 2).every((i) => ['gamma', 'delta'].includes(lemmas[i].lemma)), q.queue.map(i=>lemmas[i].lemma).join(','))
check('most overdue first (gamma 08-20 before delta 08-22)', lemmas[q.queue[0]].lemma === 'gamma')
check('new cards by desc freq, hand-known excluded', lemmas[q.queue[2]].lemma === 'beta' && lemmas[q.queue[3]].lemma === 'eps', q.queue.map(i=>lemmas[i].lemma).join(','))
check('hand-known lemma never offered as new', !q.queue.some((i) => lemmas[i].lemma === 'alpha'))
check('counts: 1 review + 1 learning', q.counts.review === 1 && q.counts.learning === 1, JSON.stringify(q.counts))

// --- deck range (minFreq) ---
// Regression test for the reported bug: the deck used to be gated by
// vocabThreshold via deriveKnownLemmas, so raising the threshold silently hid
// the commonest words. buildQueue no longer sees a threshold at all.
const noneKnown = new Set<string>()
const qAll = buildQueue(lemmas, noneKnown, {}, 10, 1, T)
check('minFreq 1 offers the highest-frequency lemma first', lemmas[qAll.queue[0]].lemma === 'alpha', qAll.queue.map(i=>lemmas[i].lemma).join(','))
check('minFreq 1 offers every lemma', qAll.queue.length === lemmas.length, String(qAll.queue.length))
const q80 = buildQueue(lemmas, noneKnown, {}, 10, 80, T)
check('minFreq 80 keeps only the three >=80x lemmas', q80.queue.length === 3, q80.queue.map(i=>lemmas[i].lemma).join(','))
check('minFreq 80 excludes the 70x lemma', !q80.queue.some((i) => lemmas[i].lemma === 'delta'))

// newPerDay cap + introduced-today derivation
const deck2: SrsDeck = { beta: { ...newCard(T), introduced: T } }
const q2 = buildQueue(lemmas, known, deck2, 2, 1, T)
check('introducedToday derived = 1', q2.counts.introducedToday === 1, String(q2.counts.introducedToday))
check('newRemaining = 2-1 = 1', q2.counts.newRemaining === 1, String(q2.counts.newRemaining))
const freshOnly = q2.queue.filter((i) => !(lemmas[i].lemma in deck2))
check('cap honoured: only 1 new offered', freshOnly.length === 1, String(freshOnly.length))
const q2again = buildQueue(lemmas, known, deck2, 2, 1, T)
check('rebuilding same day does not grow the count', q2again.counts.introducedToday === 1)
check('existing card never re-offered as new', !freshOnly.some((i) => lemmas[i].lemma === 'beta'))

// A word marked known today is not a word taken on to learn, so it must not
// spend the daily new-card allowance the way an ordinary new card does.
const deck3: SrsDeck = { beta: { ...newCard(T), introduced: T }, gamma: knownCard(undefined, D(T)) }
const q4 = buildQueue(lemmas, noneKnown, deck3, 2, 1, T)
check('hand-known card does not spend the new allowance', q4.counts.introducedToday === 1, String(q4.counts.introducedToday))
check('a genuine new card still spends it', q4.counts.newRemaining === 1, String(q4.counts.newRemaining))
check('hand-known card is not due today', !q4.queue.some((i) => lemmas[i].lemma === 'gamma'), q4.queue.map(i=>lemmas[i].lemma).join(','))
const q5 = buildQueue(lemmas, noneKnown, deck3, 2, 1, addDays(T, MAX_INTERVAL_DAYS))
check('hand-known card comes back at the ceiling', q5.queue.some((i) => lemmas[i].lemma === 'gamma'), q5.queue.map(i=>lemmas[i].lemma).join(','))

// a card whose lemma became known stays on schedule
const matureDeck: SrsDeck = { eps: { ...newCard(T), due: T, interval: 30, reps: 6 } }
const knownIncludingEps = new Set<string>(['alpha', 'eps'])
const q3 = buildQueue(lemmas, knownIncludingEps, matureDeck, 10, 1, T)
check('mature card still reviewed despite being known', q3.queue.some((i) => lemmas[i].lemma === 'eps'))

// requeue
const rq = requeue([1, 2, 3, 4, 5, 6, 7, 8, 9], 1)
check(`requeue puts head back ${RELEARN_GAP} places`, rq[RELEARN_GAP] === 1, rq.join(','))
check('requeue on short queue puts head last', requeue([1, 2], 1).join(',') === '2,1', requeue([1, 2], 1).join(','))

// --- merge ---
const A: SrsDeck = { x: { ...newCard(T), reviewed: 100 }, y: { ...newCard(T), reviewed: 200 } }
const B: SrsDeck = { y: { ...newCard(T), reviewed: 300 }, z: { ...newCard(T), reviewed: 50 } }
const m = mergeSrsDecks(A, B)
check('merge unions disjoint keys', 'x' in m && 'y' in m && 'z' in m, Object.keys(m).join(','))
check('merge keeps later reviewed', m.y.reviewed === 300, String(m.y.reviewed))
check('merge symmetric', mergeSrsDecks(B, A).y.reviewed === 300)
check('merge handles undefined sides', Object.keys(mergeSrsDecks(undefined, undefined)).length === 0)
check('merge handles one undefined', Object.keys(mergeSrsDecks(A, undefined)).length === 2)
const poison = JSON.parse('{"__proto__":{"polluted":true},"good":{"reviewed":1}}') as SrsDeck
const mp = mergeSrsDecks({}, poison)
check('__proto__ key dropped', Object.keys(mp).join(',') === 'good' && !Object.hasOwn(mp, '__proto__'), Object.keys(mp).join(','))
check('no prototype pollution', ({} as any).polluted === undefined)

// --- size canary ---
const big: SrsDeck = {}
for (let i = 0; i < 2000; i++) big[`λόγος${i}`] = { ...newCard(T), reviewed: Date.now() }
const bytes = Buffer.byteLength(JSON.stringify(big), 'utf8')
check('2,000 cards serialize under 300KB', bytes < 300_000, `${Math.round(bytes / 1024)} KB`)

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`)
process.exit(fails === 0 ? 0 : 1)
