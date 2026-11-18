/**
 * Demonstração editável identificada por datasetKind example. Usa as mesmas regras da operação, mas é persistida
 * em chave distinta da base real. Datas são relativas ao dia em que a demonstração é gerada.
 */
import { localDate, dayOffset } from './core.js';
import { blankState, validateState } from './domain.js';

/** Constrói a demonstração com notas de atendimento, tarefas e lista de compras coerentes; valida antes de devolver. */
export function exampleState() {
    const today = localDate(), d = n => dayOffset(n, today);
    let s = blankState();
    s.datasetKind = 'example';
    const c = {
        mariana: { name: 'Mariana Costa', phone: '(41) 90000-0001' },
        camila: { name: 'Camila Ribeiro', phone: '(41) 90000-0003' },
        juliana: { name: 'Juliana Martins', phone: '(41) 90000-0004' },
        fernanda: { name: 'Fernanda Lima', phone: '(41) 90000-0005' },
        ana: { name: 'Ana Clara Souza', phone: '(41) 90000-0006' },
        luiza: { name: 'Luiza Santos', phone: '(41) 90000-0007' },
        beatriz: { name: 'Beatriz Almeida', phone: '(41) 90000-0002' }
    };
    s.conversations = [
        { id: 'v1', contact: c.mariana, category: 'Segurança', status: 'open', time: '08:43', unread: true, summary: 'Mariana relatou sensibilidade após o procedimento de ontem. Precisa de avaliação direta da profissional.', messages: [{ text: 'Oi, Hanne! Senti sensibilidade no couro cabeludo depois do procedimento de ontem. Você pode falar comigo?', time: '08:43', type: 'incoming' }], draft: 'Oi, Mariana. Recebi seu relato e vou avaliar a situação com você. Pode me contar quando começou e como está agora?' },
        { id: 'v2', contact: c.camila, category: 'Orçamento', status: 'open', time: '08:35', unread: true, summary: 'Camila quer iluminar o cabelo. Ainda faltam o histórico químico e as referências para avaliação.', messages: [{ text: 'Bom dia! Queria saber mais sobre mechas e iluminação 😊', time: '08:34', type: 'incoming' }, { text: 'Você consegue me passar um orçamento?', time: '08:35', type: 'incoming' }], draft: 'Oi, Camila! Para eu avaliar seu pedido, você pode me contar quais procedimentos já fez no cabelo e enviar uma foto atual e suas referências?' },
        { id: 'v3', contact: c.juliana, category: 'Agendamento urgente', status: 'open', time: '08:22', unread: false, summary: 'Juliana pede para confirmar o horário combinado para hoje.', messages: [{ text: 'Hanne, pode conferir meu horário de hoje? Acho que anotei errado.', time: '08:22', type: 'incoming' }], draft: 'Oi, Juliana! Vou conferir e já te retorno.' },
        { id: 'v4', contact: c.fernanda, category: 'Pós-procedimento', status: 'open', time: '08:10', unread: false, summary: 'Fernanda pediu para relembrar os cuidados combinados na última visita.', messages: [{ text: 'Bom dia! Você pode me lembrar dos cuidados que combinamos na última visita?', time: '08:10', type: 'incoming' }], draft: '' },
        { id: 'v5', contact: c.luiza, category: 'Orçamento', status: 'waiting', time: 'Ontem', unread: false, summary: 'Luiza deseja um orçamento de coloração. Aguardando mais informações.', messages: [{ text: 'Gostaria de mudar a cor. Como funciona a avaliação?', time: '17:12', type: 'incoming' }], draft: '' },
        { id: 'v6', contact: c.beatriz, category: 'Informações gerais', status: 'resolved', time: 'Ontem', unread: false, summary: 'Beatriz recebeu as informações de chegada.', messages: [{ text: 'Obrigada, Hanne! Até amanhã.', time: '18:03', type: 'incoming' }], draft: '' }
    ];
    s.tasks = [
        { id: 't1', title: 'Avaliar relato da Mariana', area: 'Atendimento', priority: 'Alta', due: today, done: false, contact: c.mariana, origin: { type: 'note', id: 'v1' } },
        { id: 't2', title: 'Pedir histórico químico da Camila', area: 'Atendimento', priority: 'Média', due: today, done: false, contact: c.camila, origin: { type: 'note', id: 'v2' } },
        { id: 't3', title: 'Comprar máscara de tratamento', area: 'Compras', priority: 'Média', due: d(2), done: false, contact: null, origin: null },
        { id: 't4', title: 'Retornar a Luiza sobre a coloração', area: 'Atendimento', priority: 'Baixa', due: d(-1), done: false, contact: c.luiza, origin: { type: 'note', id: 'v5' } },
        { id: 't5', title: 'Organizar a bancada', area: 'Operação', priority: 'Baixa', due: d(-2), done: true, contact: null, origin: null }
    ];
    s.shopping = [
        { id: 'ex-buy-1', name: 'Máscara de tratamento', note: '2 potes de 1 kg', done: false },
        { id: 'ex-buy-2', name: 'Oxidante 20 volumes', note: '', done: false },
        { id: 'ex-buy-3', name: 'Luvas descartáveis', note: 'Tamanho M', done: false },
        { id: 'ex-buy-4', name: 'Toalhas de papel', note: '', done: true },
        { id: 'ex-buy-5', name: 'Café e açúcar', note: 'Para a recepção', done: false }
    ];
    return validateState(s);
}
