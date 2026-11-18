/**
 * Exclusão de registros (versão essencial). O plano mostra tudo o que será apagado ou desvinculado antes da confirmação;
 * o servidor recalcula o mesmo plano e só grava se ele coincidir com o que a pessoa conferiu.
 */

/** Coleções que podem ser apagadas numa gravação normal, quando não têm vínculos. */
export const removableCollections = ['conversations', 'tasks', 'shopping'];
/** Todas as coleções alcançáveis pela exclusão confirmada. */
export const allCollections = [...removableCollections, 'audit'];

// Vínculos fracos: apagar o pai apenas limpa a referência no filho.
const unlink = [
    { collection: 'tasks', origin: 'note', parent: 'conversations' }
];

/** Motivo que impede a exclusão numa gravação comum (sem o plano confirmado); vazio quando é permitida. */
export function deletionBlock(state, collection, id) {
    if (!removableCollections.includes(collection)) return 'Este registro só pode ser apagado pela exclusão confirmada.';
    if (!state[collection]?.some(x => x.id === id)) return 'Registro não encontrado.';
    for (const link of unlink) if (link.parent === collection && state[link.collection].some(x => x.origin?.type === link.origin && x.origin.id === id)) return 'Existe vínculo com outro registro. Use a exclusão confirmada para conferir o que muda.';
    return '';
}

const labelOf = x => x.name || x.title || x.contact?.name || x.action || x.date || x.id;

/** Plano explícito de exclusão: { next, entries } — entries lista apagados e desvinculados. */
export function deletionPlan(state, collection, id) {
    if (collection === 'operation' && id === 'all') {
        const next = structuredClone(state), entries = allCollections.flatMap(k => state[k].map(x => ({ collection: k, id: x.id, label: labelOf(x) })));
        for (const k of allCollections) next[k] = [];
        next.focus = false;
        next.settings = { name: 'Hanne', responseMinutes: 60 };
        entries.push({ collection: 'settings', id: 'settings', label: 'Configurações' });
        return { next, entries };
    }
    if (!allCollections.includes(collection) || !state[collection]?.some(x => x.id === id)) throw Error('Registro não encontrado.');
    const next = structuredClone(state), entries = [];
    next[collection] = next[collection].filter(x => x.id !== id);
    const removed = state[collection].find(x => x.id === id);
    entries.push({ collection, id, label: labelOf(removed) });
    for (const link of unlink) if (link.parent === collection) for (const x of next[link.collection]) {
        if (x.origin?.type !== link.origin || x.origin.id !== id) continue;
        x.origin = null;
        entries.push({ collection: link.collection, id: x.id, label: labelOf(x), unlinked: true });
    }
    return { next, entries };
}
