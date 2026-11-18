/** Testes de consistência das fixtures da demonstração. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { exampleState } from '../public/examples.js';
import { validateState } from '../public/domain.js';

test('demonstração é válida, identificada e cobre as áreas da versão essencial', () => {
    const s = exampleState();
    assert.equal(s.datasetKind, 'example');
    assert.doesNotThrow(() => validateState(s));
    assert.ok(s.conversations.length && s.tasks.length && s.shopping.length);
    assert.ok(s.tasks.some(t => t.origin?.type === 'note'));
    assert.ok(s.shopping.some(x => x.done) && s.shopping.some(x => !x.done));
    for (const k of ['quotes', 'services', 'products', 'movements']) assert.equal(s[k], undefined);
});
