/** Exclusão: vínculos fracos são desfeitos e o plano é determinístico. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateState } from '../public/domain.js';
import { deletionBlock, deletionPlan } from '../public/deletion.js';
import { exampleState } from '../public/examples.js';

test('gravação comum não remove nota com tarefa vinculada, mas remove item da lista', () => {
    const s = exampleState();
    assert.match(deletionBlock(s, 'conversations', 'v1'), /vínculo/);
    assert.equal(deletionBlock(s, 'conversations', 'v6'), '');
    assert.equal(deletionBlock(s, 'shopping', 'ex-buy-1'), '');
    assert.match(deletionBlock(s, 'quotes', 'q1'), /exclusão confirmada/);
});

test('excluir nota desfaz o vínculo das tarefas sem apagá-las', () => {
    const s = exampleState(), plan = deletionPlan(s, 'conversations', 'v1');
    assert.equal(plan.next.tasks.find(t => t.id === 't1').origin, null);
    assert.equal(plan.next.tasks.length, s.tasks.length);
    assert.ok(plan.entries.some(e => e.collection === 'tasks' && e.unlinked));
    assert.doesNotThrow(() => validateState(plan.next));
});

test('excluir item da lista remove só ele', () => {
    const s = exampleState(), plan = deletionPlan(s, 'shopping', 'ex-buy-2');
    assert.equal(plan.next.shopping.length, s.shopping.length - 1);
    assert.deepEqual(plan.entries, [{ collection: 'shopping', id: 'ex-buy-2', label: 'Oxidante 20 volumes' }]);
});

test('apagar todos os dados limpa todas as coleções', () => {
    const plan = deletionPlan(exampleState(), 'operation', 'all');
    for (const k of ['conversations', 'tasks', 'shopping', 'audit']) assert.equal(plan.next[k].length, 0);
    assert.doesNotThrow(() => validateState(plan.next));
});

test('plano é determinístico e registro inexistente é recusado', () => {
    const s = exampleState();
    const before = JSON.stringify(s);
    assert.equal(JSON.stringify(deletionPlan(s, 'conversations', 'v1').entries), JSON.stringify(deletionPlan(s, 'conversations', 'v1').entries));
    assert.equal(JSON.stringify(s), before, 'o plano não altera o estado recebido');
    assert.throws(() => deletionPlan(s, 'quotes', 'q1'), /não encontrado/);
});
