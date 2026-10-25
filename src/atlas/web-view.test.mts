import assert from 'node:assert/strict';
import { test } from 'node:test';

import { partLabel, showDetail, showRegionChunk, type AnatomyNode } from './body-model.ts';
import {
  atlasRequestPath,
  dragSlide,
  dragTurn,
  dragTurns,
  meshLook,
  oneFingerMovesView,
  pinchTurn,
  pinchZoom,
  tapNamesPart,
  twoFingerTurns,
  useRawWebglContext,
  wheelChangesZoom,
  wheelZoom,
} from './web-view.ts';

function node(partial: Partial<AnatomyNode> & Pick<AnatomyNode, 'userData'>): AnatomyNode {
  return { parent: null, ...partial };
}

test('the website uses the browser WebGL context and same-origin atlas files', () => {
  assert.equal(useRawWebglContext('web'), true);
  assert.equal(useRawWebglContext('ios'), false);
  assert.equal(atlasRequestPath('lod1-leg-left-bone.glb'), '/atlas/lod1-leg-left-bone.glb');
});

test('scrolling up over the figure zooms in, and the wheel stops at the same limits as the phone', () => {
  assert.equal(wheelChangesZoom('mark', true), true);
  assert.equal(wheelChangesZoom('view', true), false);
  assert.equal(wheelChangesZoom('mark', false), false);

  assert.equal(wheelZoom(1, -800), 2.6);
  assert.equal(wheelZoom(2.6, 800), 1);
  assert.equal(wheelZoom(5.9, -4000), 6);
  assert.equal(wheelZoom(1.1, 4000), 1);
});

test('a pinch zooms by its scale and turns with the same sign as a drag', () => {
  assert.equal(pinchZoom(2, 2), 4);
  assert.equal(pinchZoom(5, 3), 6);
  assert.equal(pinchZoom(1.2, 0.1), 1);
  assert.equal(pinchTurn(0, 90, 0), -30);
  assert.ok(pinchTurn(0, 0, Math.PI / 2) < 0);
});

test('rotate mode and shift-drag turn the body, and a plain drag slides it', () => {
  assert.equal(dragTurns('rotate', false), true);
  assert.equal(dragTurns('mark', true), true);
  assert.equal(dragTurns('mark', false), false);
  assert.equal(oneFingerMovesView('mark'), true);
  assert.equal(oneFingerMovesView('draw'), false);
  assert.equal(oneFingerMovesView('view'), false);
  assert.equal(twoFingerTurns('mark'), true);
  assert.equal(twoFingerTurns('view'), false);

  assert.equal(dragTurn(0, 90), -30);
  assert.equal(dragTurn(0, -90), 30);
  assert.equal(dragTurn(170, -300), 180);
  assert.equal(dragTurn(-170, 300), -180);
});

test('a sideways drag moves the body as far as an up-and-down drag of the same length', () => {
  const height = 320;
  const distance = height * 1.4;
  const down = dragSlide(0, 0, 0, distance, height);
  const right = dragSlide(0, 0, distance, 0, height);
  assert.equal(down.scroll, 1);
  assert.equal(down.slide, 0);
  assert.equal(right.slide, 1);
  assert.equal(right.scroll, 0);
  assert.equal(dragSlide(0, 0, -distance * 2, -distance * 2, height).slide, -1);
});

test('a click names the structure under it, and rotate mode does not retitle the mark', () => {
  assert.equal(tapNamesPart('mark'), true);
  assert.equal(tapNamesPart('rotate'), false);

  const linea = node({ name: 'part::Linea alba', userData: { anatomy: 'Linea alba', atlas_region: 'torso' } });
  const tract = node({
    name: 'part::Iliotibial tract.l',
    userData: { anatomy: 'Iliotibial tract.l', atlas_region: 'leg-left' },
  });
  const child = node({ name: 'mesh', userData: {}, parent: tract });
  const leg = node({
    name: 'muscle::leg-left',
    userData: { regionChunk: true, anatomy: 'Patella.l', atlas_region: 'leg-left' },
  });

  assert.equal(partLabel(linea), 'Linea alba');
  assert.equal(partLabel(tract), 'Iliotibial tract · Left');
  assert.equal(partLabel(child), 'Iliotibial tract · Left');

  assert.equal(showRegionChunk(1, true, true), true);
  assert.equal(partLabel(leg), 'Left leg');
  assert.equal(showRegionChunk(1.2, true, true), false);
  assert.equal(showDetail(1.2, true), true);
  assert.equal(partLabel(tract), 'Iliotibial tract · Left');
});

test('the picked mesh is gold and every other mesh fades', () => {
  const picked = meshLook(true, true);
  const other = meshLook(true, false);
  const none = meshLook(false, false);

  assert.equal(picked.kind, 'highlight');
  if (picked.kind === 'highlight') {
    assert.equal(picked.color, '#fff1c9');
    assert.equal(picked.emissive, '#ffb703');
    assert.equal(picked.intensity, 0.85);
    assert.equal(picked.opacity, 1);
  }
  assert.deepEqual(other, { kind: 'dim', opacity: 0.18 });
  assert.equal(none.kind, 'rest');
});
