/**
 * Regras de negócio compartilhadas entre navegador e API (versão essencial).
 * Áreas: atendimentos (notas internas), tarefas e lista de compras.
 * Não há cadastro de clientes: cada registro guarda o contato (nome e telefone) e, se houver, a origem
 * (conversa do WhatsApp ou nota interna).
 * Referências: docs/DOCUMENTACAO_TECNICA.md.
 */
import { deletionBlock, removableCollections } from './deletion.js';

/** Versão do formato salvo. A versão 3 tinha orçamentos, serviços e estoque; migrateState converte. */
export const SCHEMA = 4;
/** Coleções do estado, na ordem em que são validadas. */
export const COLLECTIONS = ['conversations', 'tasks', 'shopping'];

/** Situações da nota interna de atendimento. */
export const CONVERSATION_STATUS = ['open', 'waiting', 'resolved'];
export const PRIORITIES = ['Alta', 'Média', 'Baixa'];
export const TASK_AREAS = ['Atendimento', 'Compras', 'Operação'];

/** Estado vazio de uma conta nova. */
export function blankState() {
    return { schema: SCHEMA, focus: false, settings: { name: 'Hanne', responseMinutes: 60 }, conversations: [], tasks: [], shopping: [], audit: [] };
}

/**
 * migrateState — Converte um estado salvo na versão 3 para a versão 4. Orçamentos, serviços, produtos e
 * movimentos de estoque são descartados (decisão do titular); a lista de compras começa vazia.
 * Tarefas perdem o vínculo com orçamento e as áreas antigas viram Compras ou Operação.
 * Estados já na versão atual (ou desconhecidos) voltam sem alteração.
 */
export function migrateState(s) {
    if (!s || typeof s !== 'object' || s.schema !== 3) return s;
    const areas = { Estoque: 'Compras', 'Orçamento': 'Operação', 'Serviços': 'Operação' };
    const next = { schema: SCHEMA, focus: !!s.focus, settings: s.settings, conversations: Array.isArray(s.conversations) ? s.conversations : [], tasks: [], shopping: [], audit: Array.isArray(s.audit) ? s.audit : [] };
    if (s.datasetKind !== undefined) next.datasetKind = s.datasetKind;
    for (const t of Array.isArray(s.tasks) ? s.tasks : []) {
        const { quoteId, ...task } = t || {};
        void quoteId;
        next.tasks.push({ ...task, area: areas[task.area] || task.area });
    }
    return next;
}

/** Somente dígitos do telefone. */
export const phoneDigits = phone => String(phone || '').replace(/\D/g, '');

/** Contato válido: nome obrigatório (até 100), telefone opcional com 10 a 15 dígitos. */
export function contactIssue(contact, { required = true } = {}) {
    if (contact === null || contact === undefined) return required ? 'Informe o nome do contato.' : '';
    if (typeof contact !== 'object') return 'Contato inválido.';
    const name = typeof contact.name === 'string' ? contact.name.trim() : '', phone = typeof contact.phone === 'string' ? contact.phone : '';
    if (!name) return required || phone ? 'Informe o nome do contato.' : '';
    if (name.length > 100 || phone.length > 30) return 'Contato muito longo.';
    const digits = phoneDigits(phone);
    if (phone && (digits.length < 10 || digits.length > 15)) return 'Confira o telefone do contato, com DDD.';
    return '';
}

/** Monta o contato a partir de campos de formulário (vazio vira null). */
export function makeContact(name, phone) {
    const n = String(name || '').trim(), p = String(phone || '').trim();
    return n || p ? { name: n, phone: p } : null;
}

/** Origem do registro: conversa do WhatsApp (id da conversa no canal) ou nota interna (id em conversations). */
export function originIssue(origin, s) {
    if (origin === null || origin === undefined) return '';
    if (typeof origin !== 'object' || !['whatsapp', 'note'].includes(origin.type) || typeof origin.id !== 'string' || !origin.id || origin.id.length > 200) return 'Origem inválida.';
    if (origin.type === 'note' && !s.conversations.some(c => c.id === origin.id)) return 'A nota de atendimento de origem não existe mais.';
    return '';
}

/** Lista de contatos conhecidos (das notas e tarefas), sem repetir telefone ou nome. */
export function knownContacts(s, extra = []) {
    const seen = new Map();
    const add = c => {
        if (!c?.name?.trim()) return;
        const key = phoneDigits(c.phone).slice(-11) || c.name.trim().toLocaleLowerCase('pt-BR');
        if (!seen.has(key)) seen.set(key, { name: c.name.trim(), phone: c.phone || '' });
    };
    extra.forEach(add);
    for (const k of ['conversations', 'tasks']) for (const x of s[k] || []) add(x.contact);
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/** Registros ligados a um contato (mesmo telefone ou, sem telefone, mesmo nome). */
export function sameContact(a, b) {
    if (!a || !b) return false;
    const da = phoneDigits(a.phone).slice(-11), db = phoneDigits(b.phone).slice(-11);
    if (da && db) return da === db;
    return String(a.name || '').trim().toLocaleLowerCase('pt-BR') === String(b.name || '').trim().toLocaleLowerCase('pt-BR');
}

/**
 * validateState — Valida estrutura, referências, contatos, lista de compras e regras de exclusão.
 * Lança erro no primeiro problema; usada no navegador e no servidor.
 */
export function validateState(s, previous = null) {
    const fail = t => { throw Error(t); };
    if (!s || s.schema !== SCHEMA) fail('Formato incompatível.');
    for (const k of COLLECTIONS) {
        if (!Array.isArray(s[k]) || s[k].length > 10000) fail('Limite ou formato inválido: ' + k);
        const ids = new Set();
        for (const x of s[k]) {
            if (!x || typeof x.id !== 'string' || !x.id || x.id.length > 100 || ids.has(x.id)) fail('Identificador inválido ou duplicado.');
            ids.add(x.id);
        }
    }
    if (s.audit !== undefined && !Array.isArray(s.audit)) fail('Histórico inválido.');
    const date = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d + 'T12:00:00Z')) && new Date(d + 'T12:00:00Z').toISOString().slice(0, 10) === d;
    const text = (v, max) => v === undefined || v === null || (typeof v === 'string' && v.length <= max);
    if (!s.settings || typeof s.settings.name !== 'string' || !s.settings.name.trim() || s.settings.name.length > 100) fail('Configurações inválidas.');
    if (s.settings.responseMinutes !== undefined && (!Number.isInteger(s.settings.responseMinutes) || s.settings.responseMinutes < 5 || s.settings.responseMinutes > 1440)) fail('Prazo de resposta inválido.');
    for (const v of s.conversations) {
        const issue = contactIssue(v.contact);
        if (issue) fail(issue);
        if (!CONVERSATION_STATUS.includes(v.status) || typeof v.category !== 'string' || v.category.length > 60 || !Array.isArray(v.messages) || v.messages.length > 500 || v.messages.some(m => !m || typeof m.text !== 'string' || m.text.length > 4000 || !['incoming', 'note'].includes(m.type)) || !text(v.summary, 2000) || !text(v.draft, 4000)) fail('Nota de atendimento inválida.');
    }
    for (const t of s.tasks) {
        const issue = contactIssue(t.contact, { required: false }) || originIssue(t.origin, s);
        if (issue) fail(issue);
        if (!t.title?.trim() || t.title.length > 180 || !PRIORITIES.includes(t.priority) || typeof t.area !== 'string' || t.area.length > 40 || !date(t.due) || typeof t.done !== 'boolean') fail('Tarefa inválida.');
    }
    for (const x of s.shopping)
        if (typeof x.name !== 'string' || !x.name.trim() || x.name.length > 120 || !text(x.note, 200) || typeof x.done !== 'boolean') fail('Item da lista de compras inválido.');
    if (previous) {
        // Registros com vínculo só somem pela exclusão confirmada (servidor); os demais podem sair numa gravação comum.
        for (const collection of removableCollections) for (const old of previous[collection] || [])
            if (!s[collection].some(x => x.id === old.id)) { const issue = deletionBlock(previous, collection, old.id); if (issue) fail(issue); }
    }
    return s;
}
