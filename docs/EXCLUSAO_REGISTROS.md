# Exclusão de registros

Arquivo: `public/deletion.js`. O servidor (`lib/state-handler.mjs`) recalcula o plano a partir do estado salvo e só grava se a lista conferida pela pessoa for idêntica (`plan` do pedido `DELETE /api/state`). A exclusão exige a senha da conta.

## Gravação comum

Numa gravação comum (`POST`), um cadastro só pode desaparecer se `deletionBlock` não encontrar vínculos:

- nota de atendimento usada como origem de tarefa → bloqueado;
- itens da lista de compras não têm vínculos e podem sair direto (botão **Tirar da lista** ou **Limpar comprados**).

## Exclusão confirmada (`deletionPlan`)

| Excluir | Apaga junto | Desvincula |
|---|---|---|
| Nota de atendimento | — | Tarefas: `origin` vira `null` |
| Tarefa | — | — |
| Item da lista de compras | — | — |
| Entrada do histórico | — | — |
| `operation/all` (Configurações) | Tudo, inclusive configurações | — |

Conversas reais do WhatsApp ficam em tabelas próprias e são excluídas pela caixa do WhatsApp. Uma origem `whatsapp` em tarefa guarda só o id da conversa; se ela for apagada, o botão **Abrir conversa** leva à caixa sem a conversa.

`deletionPlan` nunca altera o estado recebido: trabalha numa cópia (há teste para isso), para que o plano exibido seja igual ao recalculado no servidor.
