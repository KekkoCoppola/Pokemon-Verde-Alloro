import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialGameState,
  markNpcTalked,
  collectTesi,
  awardAlloro,
  canStartProclamation,
  getObjectiveLabel,
  isAdjacentOrFacingTile,
} from './gameState';

test('initial game state starts on title unless autostart is true', () => {
  const s1 = createInitialGameState(false);
  assert.equal(s1.phase, 'title');
  assert.equal(s1.zone, 'cortile');
  assert.equal(s1.hasTesi, false);
  assert.equal(s1.hasAlloro, false);

  const s2 = createInitialGameState(true);
  assert.equal(s2.phase, 'playing');
});

test('proclamation requires thesis and blocks duplicate graduation', () => {
  let state = createInitialGameState(true);
  assert.deepEqual(canStartProclamation(state), { allowed: false, reason: 'missing_tesi' });

  state = collectTesi(state);
  assert.deepEqual(canStartProclamation(state), { allowed: true, reason: 'ok' });

  state = awardAlloro(state);
  assert.equal(state.hasAlloro, true);
  assert.equal(state.phase, 'victory');
  assert.deepEqual(canStartProclamation(state), { allowed: false, reason: 'already_graduated' });
});

test('objective labels track player progress across zones', () => {
  let state = createInitialGameState(true);
  assert.equal(getObjectiveLabel(state), 'Parla con Giulia per la Tesi');

  state = { ...state, zone: 'aula' };
  assert.equal(getObjectiveLabel(state), 'Torna in Cortile a prendere la Tesi');

  state = collectTesi({ ...state, zone: 'cortile' });
  assert.equal(getObjectiveLabel(state), 'Entra dalle porte blu in Aula');

  state = { ...state, zone: 'aula' };
  assert.equal(getObjectiveLabel(state), 'Parla col Presidente in cattedra');

  state = awardAlloro(state);
  assert.equal(getObjectiveLabel(state), 'Laureato 110 e Lode!');
});

test('NPC interaction adjacency and talked tracking', () => {
  let state = createInitialGameState(true);
  state = markNpcTalked(state, 'amico_1');
  state = markNpcTalked(state, 'amico_1');
  assert.deepEqual(state.talkedNpcIds, ['amico_1']);

  assert.equal(isAdjacentOrFacingTile(5, 12, 'up', 5, 11), true);
  assert.equal(isAdjacentOrFacingTile(5, 13, 'up', 5, 11), false);
});
