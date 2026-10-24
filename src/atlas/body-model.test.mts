import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  partLabel,
  prettyAnatomy,
  selectedLayers,
  showDetail,
  showRegionChunk,
  type AnatomyNode,
} from './body-model.ts';

function node(partial: Partial<AnatomyNode> & Pick<AnatomyNode, 'userData'>): AnatomyNode {
  return { parent: null, ...partial };
}

test('a humerus name is the upper-arm bone, with its side', () => {
  assert.equal(prettyAnatomy('Humerus.l'), 'Humerus · Left');
  assert.equal(prettyAnatomy('Humerus.r'), 'Humerus · Right');
  assert.equal(prettyAnatomy('Thyroid cartilage'), 'Thyroid cartilage');
});

test('a far arm chunk stays the whole arm even when its sample name is the humerus', () => {
  const arm = node({
    name: 'bone::arm-left',
    userData: { regionChunk: true, anatomy: 'Humerus.l', atlas_region: 'arm-left' },
  });
  assert.equal(partLabel(arm), 'Left arm');
});

test('a far leg chunk stays the whole leg', () => {
  const leg = node({
    name: 'bone::leg-left',
    userData: { regionChunk: true, anatomy: 'Patella.l', atlas_region: 'leg-left' },
  });
  assert.equal(partLabel(leg), 'Left leg');
});

test('a close part names that structure, not the leg or arm around it', () => {
  const femur = node({
    name: 'part::Femur.l',
    userData: { anatomy: 'Femur.l', atlas_region: 'leg-left' },
  });
  const humerus = node({
    name: 'part::Humerus.r',
    userData: { anatomy: 'Humerus.r', atlas_region: 'arm-right' },
  });
  assert.equal(partLabel(femur), 'Femur · Left');
  assert.equal(partLabel(humerus), 'Humerus · Right');
});

test('skin, muscles, and bones pick the atlas layers', () => {
  assert.deepEqual(selectedLayers('skin'), ['skin']);
  assert.deepEqual(selectedLayers('muscles'), ['muscle', 'organ']);
  assert.deepEqual(selectedLayers('bones'), ['bone']);
});

test('a close zoom hides the whole region only after its parts have loaded', () => {
  assert.equal(showRegionChunk(1, true, true), true);
  assert.equal(showDetail(1, true), false);

  assert.equal(showRegionChunk(1.2, true, false), true);
  assert.equal(showDetail(1.2, true), true);

  assert.equal(showRegionChunk(1.2, true, true), false);
  assert.equal(showDetail(1.2, true), true);

  assert.equal(showRegionChunk(2, false, true), false);
  assert.equal(showDetail(2, false), false);
});
