/** Regras da versão essencial: contatos sem cadastro, tarefas, lista de compras e migração do formato antigo. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { blankState, validateState, migrateState, contactIssue, makeContact, knownContacts, sameContact, SCHEMA, TASK_AREAS } from '../public/domain.js';
import { localDate } from '../public/core.js';

const today = localDate();

test('estado vazio não tem orçamentos, serviços, estoque, agenda nem financeiro e é válido', () => {
    const s = blankState();
    assert.equal(s.schema, SCHEMA);
    for (const k of ['clients', 'appointments', 'bills', 'payments', 'expenses', 'quotes', 'services', 'products', 'movements']) assert.equal(s[k], undefined);
    assert.deepEqual(s.shopping, []);
    assert.doesNotThrow(() => validateState(s));
});

test('contato exige nome e aceita telefone opcional com DDD', () => {
    assert.equal(contactIssue(makeContact('Ana', '')), '');
    assert.equal(contactIssue(makeContact('Ana', '(41) 99999-0000')), '');
    assert.match(contactIssue(makeContact('Ana', '1234')), /telefone/);
    assert.match(contactIssue(makeContact('', '(41) 99999-0000')), /nome/);
    assert.match(contactIssue(null), /nome/);
    assert.equal(contactIssue(null, { required: false }), '');
});

test('tarefa aceita ficar sem contato e recusa origem inexistente', () => {
    const s = blankState();
    s.tasks.push({ id: 't', title: 'Comprar luvas', area: 'Compras', priority: 'Média', due: today, done: false, contact: null, origin: null });
    assert.doesNotThrow(() => validateState(s));
    s.tasks[0].origin = { type: 'note', id: 'nada' };
    assert.throws(() => validateState(s), /origem/);
    assert.deepEqual(TASK_AREAS, ['Atendimento', 'Compras', 'Operação']);
});

test('item da lista de compras exige nome; observação é opcional e limitada', () => {
    const s = blankState();
    s.shopping.push({ id: 'i', name: 'Oxidante', note: '', done: false });
    assert.doesNotThrow(() => validateState(s));
    s.shopping[0].note = 'x'.repeat(201);
    assert.throws(() => validateState(s), /lista de compras/);
    s.shopping[0].note = '2 frascos'; s.shopping[0].name = '   ';
    assert.throws(() => validateState(s), /lista de compras/);
    s.shopping[0].name = 'Oxidante'; s.shopping[0].done = 'sim';
    assert.throws(() => validateState(s), /lista de compras/);
});

test('item da lista sai numa gravação comum (sem senha), porque não tem vínculos', () => {
    const before = blankState();
    before.shopping.push({ id: 'i', name: 'Oxidante', note: '', done: true });
    const after = structuredClone(before); after.shopping = [];
    assert.doesNotThrow(() => validateState(after, before));
});

test('nota com tarefa vinculada não some numa gravação comum', () => {
    const before = blankState();
    before.conversations.push({ id: 'v', contact: { name: 'Ana' }, category: 'x', status: 'open', messages: [] });
    before.tasks.push({ id: 't', title: 'Responder', area: 'Atendimento', priority: 'Média', due: today, done: false, contact: null, origin: { type: 'note', id: 'v' } });
    const after = structuredClone(before); after.conversations = []; after.tasks[0].origin = null;
    assert.throws(() => validateState(after, before), /exclusão confirmada/);
});

test('migração descarta orçamentos, serviços e estoque e preserva atendimentos e tarefas', () => {
    const old = { schema: 3, focus: true, settings: { name: 'Ateliê', responseMinutes: 30 }, services: [{ id: 's1', name: 'Corte', duration: 60 }],
        conversations: [{ id: 'v', contact: { name: 'Ana', phone: '' }, category: 'Orçamento', status: 'open', messages: [] }],
        quotes: [{ id: 'q', contact: { name: 'Ana' }, status: 'review', value: null, date: today, photos: [] }],
        tasks: [{ id: 't1', title: 'Repor', area: 'Estoque', priority: 'Média', due: today, done: false, contact: null, origin: null },
            { id: 't2', title: 'Retomar orçamento', area: 'Orçamento', priority: 'Alta', due: today, done: false, contact: null, origin: { type: 'note', id: 'v' }, quoteId: 'q' },
            { id: 't3', title: 'Atualizar catálogo', area: 'Serviços', priority: 'Baixa', due: today, done: true, contact: null, origin: null }],
        products: [{ id: 'p' }], movements: [{ id: 'm', productId: 'p' }], audit: [{ id: 'a', action: 'x' }] };
    const s = migrateState(old);
    assert.equal(s.schema, SCHEMA);
    for (const k of ['quotes', 'services', 'products', 'movements']) assert.equal(s[k], undefined);
    assert.deepEqual(s.shopping, []);
    assert.equal(s.conversations.length, 1);
    assert.deepEqual(s.tasks.map(t => t.area), ['Compras', 'Operação', 'Operação']);
    assert.ok(s.tasks.every(t => !('quoteId' in t)));
    assert.equal(s.tasks[1].origin.id, 'v');
    assert.equal(s.audit.length, 1);
    assert.equal(s.focus, true);
    assert.doesNotThrow(() => validateState(s));
    assert.equal(old.quotes.length, 1, 'não altera o objeto original');
    const current = blankState();
    assert.equal(migrateState(current), current);
});

test('migração mantém a marca de demonstração', () => {
    const s = migrateState({ schema: 3, datasetKind: 'example', settings: { name: 'Hanne' }, conversations: [], tasks: [], audit: [] });
    assert.equal(s.datasetKind, 'example');
    assert.doesNotThrow(() => validateState(s));
});

test('lista de contatos junta registros sem repetir o telefone', () => {
    const s = blankState();
    s.conversations.push({ id: 'v', contact: { name: 'Ana Souza', phone: '(41) 99999-0000' }, category: 'x', status: 'open', messages: [] });
    s.tasks.push({ id: 't', title: 'Ligar', area: 'Atendimento', priority: 'Média', due: today, done: false, contact: { name: 'Ana', phone: '41999990000' }, origin: null });
    const list = knownContacts(s, [{ name: 'Bia', phone: '5541988887777' }]);
    assert.deepEqual(list.map(c => c.name), ['Ana Souza', 'Bia']);
    assert.ok(sameContact({ name: 'x', phone: '+55 (41) 99999-0000' }, { name: 'y', phone: '41999990000' }));
});
