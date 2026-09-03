import assert from 'node:assert/strict';

import {
  daysBetween,
  formatDayEnd,
  formatDayEndLabel,
  isConsecutive,
  logicalDateKey,
  logicalDayEnd,
  nextDateKey,
  parseDayEnd,
} from '@/store/day';
import {
  dayCompletionBonus,
  levelFromXp,
  nextTierAt,
  streakTier,
  xpToAdvance,
} from '@/store/leveling';
import { dayStatus, makeSchedule, reducer, type Action } from '@/store/reducer';
import { createInitialState, type AppState, type Task } from '@/store/types';

let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL ${name}`);
    console.log(`       ${String((error as Error).message).split('\n')[0]}`);
  }
}

const at = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min, 0, 0).getTime();

/* ---------------------------------------------------------------- day.ts */
console.log('\nday.ts');

check('parseDayEnd handles valid, invalid and out-of-range input', () => {
  assert.equal(parseDayEnd('02:00'), 120);
  assert.equal(parseDayEnd('23:59'), 1439);
  assert.equal(parseDayEnd('00:00'), 0);
  assert.equal(parseDayEnd('nonsense'), 0);
  assert.equal(parseDayEnd('25:00'), 0);
  assert.equal(parseDayEnd('12:99'), 0);
});

check('formatDayEnd round-trips and wraps', () => {
  assert.equal(formatDayEnd(120), '02:00');
  assert.equal(formatDayEnd(0), '00:00');
  assert.equal(formatDayEnd(1440), '00:00');
  assert.equal(formatDayEnd(-60), '23:00');
});

check('formatDayEndLabel renders 12-hour time', () => {
  assert.equal(formatDayEndLabel('02:00'), '2:00 AM');
  assert.equal(formatDayEndLabel('00:00'), '12:00 AM');
  assert.equal(formatDayEndLabel('12:30'), '12:30 PM');
  assert.equal(formatDayEndLabel('23:05'), '11:05 PM');
});

check('1am with a 2am day end still belongs to the previous day', () => {
  assert.equal(logicalDateKey(at(2026, 9, 5, 1, 0), '02:00'), '2026-09-04');
  assert.equal(logicalDateKey(at(2026, 9, 5, 1, 59), '02:00'), '2026-09-04');
  assert.equal(logicalDateKey(at(2026, 9, 5, 2, 0), '02:00'), '2026-09-05');
});

check('midnight day end behaves like the calendar date', () => {
  assert.equal(logicalDateKey(at(2026, 9, 5, 0, 0), '00:00'), '2026-09-05');
  assert.equal(logicalDateKey(at(2026, 9, 4, 23, 59), '00:00'), '2026-09-04');
});

check('logicalDayEnd lands on the right instant', () => {
  assert.equal(logicalDayEnd('2026-09-04', '02:00'), at(2026, 9, 5, 2, 0));
  assert.equal(logicalDayEnd('2026-09-04', '00:00'), at(2026, 9, 5, 0, 0));
});

check('a day contains exactly its own timestamps', () => {
  const key = '2026-09-04';
  const end = logicalDayEnd(key, '02:00');
  assert.equal(logicalDateKey(end - 1, '02:00'), key);
  assert.equal(logicalDateKey(end, '02:00'), '2026-09-05');
});

check('daysBetween and nextDateKey cross month and year boundaries', () => {
  assert.equal(daysBetween('2026-09-04', '2026-09-05'), 1);
  assert.equal(daysBetween('2026-08-31', '2026-09-01'), 1);
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1);
  assert.equal(daysBetween('2026-09-04', '2026-09-04'), 0);
  assert.equal(daysBetween('2026-09-10', '2026-09-04'), -6);
  assert.equal(nextDateKey('2026-02-28', 1), '2026-03-01');
  assert.equal(nextDateKey('2028-02-28', 1), '2028-02-29');
});

check('isConsecutive is strict', () => {
  assert.ok(isConsecutive('2026-09-04', '2026-09-05'));
  assert.ok(!isConsecutive('2026-09-04', '2026-09-06'));
  assert.ok(!isConsecutive('2026-09-04', '2026-09-04'));
});

/* ------------------------------------------------------------ leveling.ts */
console.log('\nleveling.ts');

check('level 1 spans 0-99 XP', () => {
  assert.equal(levelFromXp(0).level, 1);
  assert.equal(levelFromXp(99).level, 1);
  assert.equal(levelFromXp(0).xpForNext, 100);
});

check('thresholds match the 100/150/200 curve', () => {
  assert.equal(levelFromXp(100).level, 2);
  assert.equal(levelFromXp(249).level, 2);
  assert.equal(levelFromXp(250).level, 3);
  assert.equal(levelFromXp(450).level, 4);
  assert.equal(xpToAdvance(1), 100);
  assert.equal(xpToAdvance(3), 200);
});

check('progress is consistent with the remainder', () => {
  const info = levelFromXp(175);
  assert.equal(info.level, 2);
  assert.equal(info.xpIntoLevel, 75);
  assert.equal(info.xpForNext, 150);
  assert.equal(info.progress, 0.5);
});

check('negative and fractional XP are clamped, never NaN', () => {
  assert.equal(levelFromXp(-50).level, 1);
  assert.equal(levelFromXp(-50).totalXp, 0);
  assert.ok(Number.isFinite(levelFromXp(10.7).progress));
});

check('a large XP total terminates at a sane level', () => {
  const info = levelFromXp(1_000_000);
  assert.ok(info.level > 100 && info.level < 1000);
  assert.ok(info.xpIntoLevel < info.xpForNext);
});

check('streak tiers switch at the documented thresholds', () => {
  assert.equal(streakTier(0).name, 'none');
  assert.equal(streakTier(1).name, 'spark');
  assert.equal(streakTier(2).name, 'spark');
  assert.equal(streakTier(3).name, 'flame');
  assert.equal(streakTier(6).name, 'flame');
  assert.equal(streakTier(7).name, 'blaze');
  assert.equal(streakTier(14).name, 'aurora');
  assert.equal(streakTier(30).name, 'cosmic');
  assert.equal(streakTier(999).name, 'cosmic');
});

check('nextTierAt points at the upcoming threshold', () => {
  assert.equal(nextTierAt(0), 1);
  assert.equal(nextTierAt(2), 3);
  assert.equal(nextTierAt(29), 30);
  assert.equal(nextTierAt(30), null);
});

check('completion bonus grows with the streak', () => {
  assert.ok(dayCompletionBonus(30) > dayCompletionBonus(1));
});

/* ------------------------------------------------------------- reducer.ts */
console.log('\nreducer.ts');

const task = (id: string, xp: number): Task => ({ id, title: `Task ${id}`, xp });

function boot(tasks: Task[], now: number): AppState {
  const schedule = { ...makeSchedule('Morning'), id: 'sched-1', tasks };
  const state = reducer(createInitialState(), {
    type: 'addSchedule',
    schedule,
    makeActive: true,
  });
  return reducer(state, { type: 'syncDay', now });
}

const run = (state: AppState, ...actions: Action[]) =>
  actions.reduce((acc, action) => reducer(acc, action), state);

check('syncDay snapshots the active schedule into today', () => {
  const state = boot([task('a', 10), task('b', 20)], at(2026, 9, 4, 9));
  assert.equal(state.today?.date, '2026-09-04');
  assert.equal(state.today?.tasks.length, 2);
  assert.equal(state.today?.outcome, 'pending');
});

check('ticking awards XP and un-ticking takes it back exactly', () => {
  let state = boot([task('a', 10), task('b', 20)], at(2026, 9, 4, 9));
  state = run(state, { type: 'toggleTask', taskId: 'b' });
  assert.equal(state.profile.totalXp, 20);
  assert.equal(state.today?.xpEarned, 20);
  state = run(state, { type: 'toggleTask', taskId: 'b' });
  assert.equal(state.profile.totalXp, 0);
  assert.equal(state.today?.xpEarned, 0);
  assert.deepEqual(state.today?.completedIds, []);
});

check('XP never goes negative', () => {
  let state = boot([task('a', 50)], at(2026, 9, 4, 9));
  state = run(state, { type: 'toggleTask', taskId: 'a' }, { type: 'toggleTask', taskId: 'a' });
  assert.equal(state.profile.totalXp, 0);
});

check('toggling an unknown task is a no-op', () => {
  const state = boot([task('a', 10)], at(2026, 9, 4, 9));
  assert.equal(reducer(state, { type: 'toggleTask', taskId: 'ghost' }), state);
});

check('dayStatus reports complete only when every task is ticked', () => {
  const now = at(2026, 9, 4, 9);
  let state = boot([task('a', 10), task('b', 20)], now);
  assert.equal(dayStatus(state, now), 'active');
  state = run(state, { type: 'toggleTask', taskId: 'a' });
  assert.equal(dayStatus(state, now), 'active');
  state = run(state, { type: 'toggleTask', taskId: 'b' });
  assert.equal(dayStatus(state, now), 'complete');
});

check('an unfinished day that runs out reports expired', () => {
  const state = boot([task('a', 10)], at(2026, 9, 4, 9));
  assert.equal(dayStatus(state, at(2026, 9, 5, 3)), 'expired');
});

check('the grace hour suppresses expiry, then lets it return', () => {
  const expired = at(2026, 9, 5, 3);
  let state = boot([task('a', 10)], at(2026, 9, 4, 9));
  state = run(state, { type: 'grantGrace', now: expired });
  assert.equal(dayStatus(state, expired + 1000), 'grace');
  assert.equal(dayStatus(state, expired + 61 * 60 * 1000), 'expired');
});

check('finishing during the grace hour shows the celebration, not the punishment', () => {
  const expired = at(2026, 9, 5, 3);
  let state = boot([task('a', 10)], at(2026, 9, 4, 9));
  state = run(state, { type: 'grantGrace', now: expired }, { type: 'toggleTask', taskId: 'a' });
  assert.equal(dayStatus(state, expired + 1000), 'complete');
});

check('an empty schedule produces no day-end screen at all', () => {
  const now = at(2026, 9, 4, 9);
  const state = boot([], now);
  assert.equal(dayStatus(state, now), 'none');
  assert.equal(dayStatus(state, at(2026, 9, 6, 9)), 'none');
});

check('a completed day starts the streak at 1 and pays the bonus', () => {
  let state = boot([task('a', 10)], at(2026, 9, 4, 9));
  state = run(
    state,
    { type: 'toggleTask', taskId: 'a' },
    { type: 'startNewDay', now: at(2026, 9, 5, 8) }
  );
  assert.equal(state.profile.streak, 1);
  assert.equal(state.profile.bestStreak, 1);
  assert.equal(state.profile.lastSuccessDate, '2026-09-04');
  assert.equal(state.history[0].outcome, 'success');
  assert.equal(state.profile.totalXp, 10 + dayCompletionBonus(1));
  assert.equal(state.today?.date, '2026-09-05');
  assert.deepEqual(state.today?.completedIds, []);
});

check('consecutive completed days extend the streak', () => {
  let state = boot([task('a', 10)], at(2026, 9, 4, 9));
  for (let day = 4; day <= 8; day += 1) {
    state = run(
      state,
      { type: 'toggleTask', taskId: 'a' },
      { type: 'startNewDay', now: at(2026, 9, day + 1, 8) }
    );
  }
  assert.equal(state.profile.streak, 5);
  assert.equal(state.profile.bestStreak, 5);
  assert.equal(state.history.length, 5);
});

check('an unfinished day zeroes the streak but keeps the best', () => {
  let state = boot([task('a', 10), task('b', 10)], at(2026, 9, 4, 9));
  state = run(
    state,
    { type: 'toggleTask', taskId: 'a' },
    { type: 'toggleTask', taskId: 'b' },
    { type: 'startNewDay', now: at(2026, 9, 5, 8) },
    { type: 'toggleTask', taskId: 'a' },
    { type: 'startNewDay', now: at(2026, 9, 6, 8) }
  );
  assert.equal(state.profile.streak, 0);
  assert.equal(state.profile.bestStreak, 1);
  assert.equal(state.history[0].outcome, 'missed');
});

check('days the app was never opened are backfilled as misses', () => {
  let state = boot([task('a', 10)], at(2026, 9, 4, 9));
  state = run(
    state,
    { type: 'toggleTask', taskId: 'a' },
    // Completed the 4th, then vanished until the 8th.
    { type: 'startNewDay', now: at(2026, 9, 8, 9) }
  );
  assert.equal(state.history.length, 4, 'the 4th plus three skipped days');
  assert.equal(state.history[3].date, '2026-09-04');
  assert.equal(state.history[3].outcome, 'success');
  assert.deepEqual(
    state.history.slice(0, 3).map((record) => record.date),
    ['2026-09-07', '2026-09-06', '2026-09-05']
  );
  assert.ok(state.history.slice(0, 3).every((record) => record.outcome === 'missed'));
  assert.equal(state.profile.streak, 0, 'the gap breaks the streak even though the 4th was a win');
  assert.equal(state.today?.date, '2026-09-08');
});

check('history is newest-first', () => {
  let state = boot([task('a', 10)], at(2026, 9, 4, 9));
  state = run(
    state,
    { type: 'startNewDay', now: at(2026, 9, 5, 9) },
    { type: 'startNewDay', now: at(2026, 9, 6, 9) }
  );
  assert.equal(state.history[0].date, '2026-09-05');
  assert.equal(state.history[1].date, '2026-09-04');
});

check('EDGE CASE: deleting a task tomorrow does not rewrite yesterday', () => {
  let state = boot([task('workout', 30), task('read', 20)], at(2026, 9, 4, 9));
  state = run(
    state,
    { type: 'toggleTask', taskId: 'workout' },
    { type: 'toggleTask', taskId: 'read' },
    { type: 'startNewDay', now: at(2026, 9, 5, 9) }
  );
  const mondayBefore = JSON.parse(JSON.stringify(state.history[0]));

  // Tuesday: drop "workout" from the schedule entirely.
  state = run(
    state,
    { type: 'setScheduleTasks', id: 'sched-1', tasks: [task('read', 20)] },
    { type: 'syncDay', now: at(2026, 9, 5, 10) }
  );

  assert.deepEqual(state.history[0], mondayBefore, 'Mondays record is untouched');
  assert.equal(state.history[0].tasks.length, 2);
  assert.equal(state.history[0].outcome, 'success');
  assert.equal(state.profile.streak, 1, 'the streak earned on Monday survives');
});

check('a task added mid-day joins today, a deleted one stays winnable', () => {
  let state = boot([task('a', 10)], at(2026, 9, 4, 9));
  state = run(
    state,
    { type: 'setScheduleTasks', id: 'sched-1', tasks: [task('a', 10), task('c', 40)] },
    { type: 'syncDay', now: at(2026, 9, 4, 10) }
  );
  assert.equal(state.today?.tasks.length, 2);

  state = run(
    state,
    { type: 'setScheduleTasks', id: 'sched-1', tasks: [] },
    { type: 'syncDay', now: at(2026, 9, 4, 11) }
  );
  assert.equal(state.today?.tasks.length, 2, 'removals do not shrink the running day');
});

check('renaming a task updates today but leaves its XP frozen', () => {
  let state = boot([task('a', 10)], at(2026, 9, 4, 9));
  state = run(
    state,
    { type: 'toggleTask', taskId: 'a' },
    {
      type: 'setScheduleTasks',
      id: 'sched-1',
      tasks: [{ id: 'a', title: 'Renamed', xp: 100 }],
    },
    { type: 'syncDay', now: at(2026, 9, 4, 10) }
  );
  assert.equal(state.today?.tasks[0].title, 'Renamed');
  assert.equal(state.today?.tasks[0].xp, 10, 'frozen so the award can be reversed exactly');
  state = run(state, { type: 'toggleTask', taskId: 'a' });
  assert.equal(state.profile.totalXp, 0, 'un-ticking refunds precisely what was awarded');
});

check('renaming the schedule relabels today but not history', () => {
  let state = boot([task('a', 10)], at(2026, 9, 4, 9));
  state = run(state, { type: 'startNewDay', now: at(2026, 9, 5, 9) });
  state = run(
    state,
    { type: 'renameSchedule', id: 'sched-1', name: 'Evening' },
    { type: 'syncDay', now: at(2026, 9, 5, 10) }
  );
  assert.equal(state.today?.scheduleName, 'Evening');
  assert.equal(state.history[0].scheduleName, 'Morning');
});

check('switching the active schedule restarts the day but banks earned XP', () => {
  let state = boot([task('a', 10)], at(2026, 9, 4, 9));
  state = run(state, { type: 'toggleTask', taskId: 'a' });
  assert.equal(state.profile.totalXp, 10);

  const other = { ...makeSchedule('Evening'), id: 'sched-2', tasks: [task('z', 25)] };
  state = run(
    state,
    { type: 'addSchedule', schedule: other },
    { type: 'setActiveSchedule', id: 'sched-2' },
    { type: 'syncDay', now: at(2026, 9, 4, 10) }
  );
  assert.equal(state.today?.scheduleId, 'sched-2');
  assert.deepEqual(state.today?.completedIds, []);
  assert.equal(state.profile.totalXp, 10, 'XP already earned is not clawed back');
});

check('deleting the active schedule clears today and promotes another', () => {
  let state = boot([task('a', 10)], at(2026, 9, 4, 9));
  const other = { ...makeSchedule('Evening'), id: 'sched-2', tasks: [task('z', 25)] };
  state = run(state, { type: 'addSchedule', schedule: other });
  state = run(state, { type: 'deleteSchedule', id: 'sched-1' });
  assert.equal(state.today, null);
  assert.equal(state.activeScheduleId, 'sched-2');
  state = run(state, { type: 'syncDay', now: at(2026, 9, 4, 10) });
  assert.equal(state.today?.scheduleId, 'sched-2');
});

check('celebration dismissal is remembered, and un-ticking re-arms it', () => {
  let state = boot([task('a', 10)], at(2026, 9, 4, 9));
  state = run(state, { type: 'toggleTask', taskId: 'a' }, { type: 'dismissCelebration' });
  assert.equal(state.celebratedDate, '2026-09-04');
  state = run(state, { type: 'toggleTask', taskId: 'a' });
  assert.equal(state.celebratedDate, undefined);
});

check('starting a new day clears grace and celebration flags', () => {
  let state = boot([task('a', 10)], at(2026, 9, 4, 9));
  state = run(
    state,
    { type: 'toggleTask', taskId: 'a' },
    { type: 'dismissCelebration' },
    { type: 'grantGrace', now: at(2026, 9, 5, 3) },
    { type: 'startNewDay', now: at(2026, 9, 5, 4) }
  );
  assert.equal(state.graceUntil, undefined);
  assert.equal(state.celebratedDate, undefined);
});

check('turning notifications off also disables the hourly sub-setting', () => {
  let state = createInitialState();
  state = run(
    state,
    { type: 'patchSettings', patch: { notifications: true } },
    { type: 'patchSettings', patch: { hourlyReminders: true } }
  );
  assert.equal(state.settings.hourlyReminders, true);
  state = run(state, { type: 'patchSettings', patch: { notifications: false } });
  assert.equal(state.settings.hourlyReminders, false);
});

check('moveSchedule reorders and refuses to run off either end', () => {
  let state = createInitialState();
  for (const id of ['s1', 's2', 's3']) {
    state = run(state, { type: 'addSchedule', schedule: { ...makeSchedule(id), id } });
  }
  state = run(state, { type: 'moveSchedule', id: 's3', direction: -1 });
  assert.deepEqual(
    state.schedules.map((schedule) => schedule.id),
    ['s1', 's3', 's2']
  );
  assert.equal(reducer(state, { type: 'moveSchedule', id: 's1', direction: -1 }), state);
});

check('a day is only closed once its real boundary has passed', () => {
  const morning = at(2026, 9, 4, 9);
  let state = boot([task('a', 10)], morning);
  // Manual "Just Woke Up" hours before the 02:00 boundary: same day, no streak.
  state = run(
    state,
    { type: 'toggleTask', taskId: 'a' },
    { type: 'startNewDay', now: at(2026, 9, 4, 10) }
  );
  assert.equal(state.today?.date, '2026-09-04', 'still the same logical day');
  assert.equal(state.profile.streak, 1);

  // And again, and again. None of these are new days.
  for (const hour of [11, 12, 13]) {
    state = run(
      state,
      { type: 'toggleTask', taskId: 'a' },
      { type: 'startNewDay', now: at(2026, 9, 4, hour) }
    );
  }
  assert.equal(state.profile.streak, 1, 'repeated resets in one sitting are one day');
  assert.equal(state.profile.bestStreak, 1);
});

check('REGRESSION: changing the day-end time cannot manufacture a streak', () => {
  // Reported as "why does it say 2d best when I started an hour ago" — moving
  // the boundary used to shift the logical date, which read as a day elapsing.
  const justAfterMidnight = at(2026, 9, 5, 0, 30);
  let state = boot([task('a', 10)], justAfterMidnight);

  state = run(
    state,
    { type: 'toggleTask', taskId: 'a' },
    { type: 'startNewDay', now: justAfterMidnight + 60_000 }
  );
  assert.equal(state.profile.streak, 1);

  // Nudging the setting must not advance the calendar.
  for (const dayEndsAt of ['00:00', '23:00', '01:00', '12:00']) {
    state = run(
      state,
      { type: 'patchSettings', patch: { dayEndsAt } },
      { type: 'syncDay', now: justAfterMidnight + 120_000 },
      ...(state.today?.tasks ?? []).map(
        (entry) => ({ type: 'toggleTask', taskId: entry.id }) as Action
      ),
      { type: 'startNewDay', now: justAfterMidnight + 180_000 }
    );
  }

  assert.equal(state.profile.streak, 1, 'no free days from moving the boundary');
  assert.equal(state.profile.bestStreak, 1);
});

check('moving the day end to a moment the running day has already passed ends it', () => {
  // The day begins at 09:00.
  let state = boot([task('a', 10)], at(2026, 9, 4, 9));
  const now = at(2026, 9, 4, 15, 0);
  assert.equal(dayStatus(state, now), 'active');

  // At 15:00, "my day ends at 14:00" names a moment this day already went past.
  state = run(state, { type: 'patchSettings', patch: { dayEndsAt: '14:00' } });
  assert.equal(dayStatus(state, now), 'expired');
});

check('a day end set just ahead of now expires shortly, not a day later', () => {
  // How the punishment screen gets tested by hand.
  let state = boot([task('a', 10)], at(2026, 9, 4, 9));
  const now = at(2026, 9, 4, 15, 0);

  state = run(state, { type: 'patchSettings', patch: { dayEndsAt: '15:02' } });
  assert.equal(dayStatus(state, now), 'active', 'not yet');
  assert.equal(dayStatus(state, at(2026, 9, 4, 15, 3)), 'expired', 'three minutes later, yes');
});

check('a day end set before the day started lands on the next occurrence', () => {
  // Day begins at 15:00; "ends at 14:00" can only mean tomorrow's 14:00.
  let state = boot([task('a', 10)], at(2026, 9, 4, 15));
  state = run(state, { type: 'patchSettings', patch: { dayEndsAt: '14:00' } });

  assert.equal(dayStatus(state, at(2026, 9, 4, 23)), 'active');
  assert.equal(dayStatus(state, at(2026, 9, 5, 13)), 'active');
  assert.equal(dayStatus(state, at(2026, 9, 5, 15)), 'expired');
});

check('moving the day end later gives the running day more room', () => {
  const now = at(2026, 9, 4, 15, 0);
  let state = boot([task('a', 10)], now);
  const before = state.today!.expiresAt;

  state = run(state, { type: 'patchSettings', patch: { dayEndsAt: '23:00' } });
  assert.ok(state.today!.expiresAt > now, 'still live');
  assert.notEqual(state.today!.expiresAt, before, 're-anchored to the new boundary');
  assert.equal(state.today?.date, '2026-09-04', 'but it is still the same day');
});

check('REGRESSION: switching schedules cannot dodge an expired day', () => {
  let state = boot([task('a', 10)], at(2026, 9, 4, 9));
  state = run(
    state,
    { type: 'toggleTask', taskId: 'a' },
    { type: 'startNewDay', now: at(2026, 9, 5, 3) }
  );
  assert.equal(state.profile.streak, 1);

  // Let the next day lapse unfinished, then try to escape it by switching.
  const later = at(2026, 9, 6, 12);
  const other = { ...makeSchedule('Evening'), id: 'sched-2', tasks: [task('z', 25)] };
  state = run(
    state,
    { type: 'syncDay', now: later },
    { type: 'addSchedule', schedule: other },
    { type: 'setActiveSchedule', id: 'sched-2' },
    { type: 'syncDay', now: later }
  );

  assert.equal(dayStatus(state, later), 'expired', 'the lapsed day still has to be faced');

  state = run(state, { type: 'startNewDay', now: later });
  assert.equal(state.profile.streak, 0, 'and it still breaks the streak');
  assert.equal(state.history[0].outcome, 'missed');
});

check('resetEverything wipes data but keeps the chosen theme', () => {
  let state = boot([task('a', 10)], at(2026, 9, 4, 9));
  state = run(
    state,
    { type: 'patchSettings', patch: { darkMode: true } },
    { type: 'toggleTask', taskId: 'a' },
    { type: 'resetEverything' }
  );
  assert.equal(state.schedules.length, 0);
  assert.equal(state.profile.totalXp, 0);
  assert.equal(state.settings.darkMode, true);
});

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
