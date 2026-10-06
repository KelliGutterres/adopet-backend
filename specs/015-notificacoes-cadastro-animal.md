# Spec 015 — Notificações de cadastro de animal

> **Status:** aprovada e implementada (2026-10-05).  
> Depende de: spec 005 (CRUD `/animais`).  
> Consumida pelo painel web (web spec 016) e pelo app (mobile spec 017).

---

## Objetivo

Sempre que um usuário (mobile) ou uma ONG (painel) cadastrar um animal — para adoção (`A`), perdido (`P`) ou encontrado (`E`) — gravar uma notificação in-app para as outras contas autenticadas.

---

## Recorte vs o que já existe

| Fluxo | Onde está | Nesta spec |
|-------|-----------|------------|
| `POST /animais` | spec 005 | **estender**: na mesma transação do insert, gravar a notificação |
| Edição, exclusão, foto | specs 005, 008, 010 | **sem** notificação nova |
| Auth JWT `usuario` e `ong` | spec 003 | **reutilizar** `authenticate` + `authorize('ong', 'usuario')` |

Não há push, e-mail nem SMS. O aviso fica no banco e os clientes consultam a API.

---

## Decisões

1. O gatilho é só o **cadastro** bem-sucedido (`POST /animais`). Editar, excluir ou enviar foto não gera outra notificação.
2. Uma linha por cadastro, visível para **todas** as contas autenticadas **exceto o autor**. A ONG não vê o próprio cadastro; o usuário não vê o próprio cadastro. Os dois papéis veem o cadastro do outro.
3. O texto é gravado na hora (nome do autor, nome do animal, espécie). Renomear o animal depois não reescreve o aviso.
4. Excluir o animal **não** apaga a notificação: `idAnimal` fica nulo. O cliente mostra o texto e não abre o detalhe.
5. Cada conta marca a própria leitura. A leitura de uma não altera a da outra.
6. Animais já existentes (seed e cadastros anteriores) **não** geram aviso retroativo.
7. A listagem devolve no máximo 50 avisos, do mais recente para o mais antigo. `naoLidas` conta todos os não lidos visíveis para aquela conta, mesmo acima de 50.
8. Sem token → 401. A notificação do próprio autor, ou id inexistente, → 404 em `PATCH .../lida`.

---

## Modelo

`Notificacao`:

| Campo | Tipo | Notas |
|-------|------|--------|
| `idNotificacao` | int PK | autoincrement |
| `tipo` | varchar(40) | `ANIMAL_CADASTRADO` |
| `titulo` | varchar(120) | `Novo animal para adoção` / `Novo animal perdido` / `Novo animal encontrado` |
| `mensagem` | varchar(200) | `{autor} cadastrou {nome} ({Cão\|Gato}).` |
| `idAnimal` | int? | FK `Animal`, `ON DELETE SET NULL` |
| `idUsuarioAutor` | int? | autor quando o papel é `usuario`; sem FK |
| `idInstituicaoAutor` | int? | autor quando o papel é `ong`; sem FK |
| `criadoEm` | DateTime | default `now()` |

Índice em `criadoEm`.

`NotificacaoLeitura`:

| Campo | Tipo | Notas |
|-------|------|--------|
| `idNotificacao` | int | FK, `ON DELETE CASCADE`; parte da PK |
| `papel` | varchar(20) | `usuario` ou `ong` |
| `idConta` | int | `idUsuario` ou `idInstituicao` |
| `lidaEm` | DateTime | default `now()` |

PK `(idNotificacao, papel, idConta)`.

---

## Contrato

`GET /notificacoes`

- Auth: JWT `usuario` ou `ong`.
- 200:

```json
{
  "naoLidas": 1,
  "notificacoes": [
    {
      "idNotificacao": 1,
      "tipo": "ANIMAL_CADASTRADO",
      "titulo": "Novo animal perdido",
      "mensagem": "Maria cadastrou Luna (Gato).",
      "lida": false,
      "criadoEm": "2026-10-05T21:00:00.000Z",
      "animal": {
        "idAnimal": 2,
        "nome": "Luna",
        "status": "P",
        "urlImagem": null
      }
    }
  ]
}
```

`animal` é `null` se o animal foi excluído. `criadoEm` é ISO 8601. O JSON não inclui os ids do autor.

`PATCH /notificacoes/:id/lida` — marca uma como lida para a conta do token. Idempotente. 204.

`PATCH /notificacoes/lidas` — marca como lidas todas as visíveis ainda não lidas. Idempotente. 204.

---

## Fora de escopo

- Push, e-mail, SMS e WebSocket.
- Notificação de edição, exclusão, foto ou comparação de similaridade.
- Aviso para quem não está autenticado.
- Reescrever specs anteriores de CRUD.

---

## Critérios de pronto

- [ ] `POST /animais` com JWT de usuário ou de ONG grava uma notificação na mesma transação.
- [ ] O autor não recebe o próprio aviso; a outra conta recebe.
- [ ] Os três status (`A`, `P`, `E`) geram título correspondente.
- [ ] `GET /notificacoes` exige JWT e devolve `naoLidas` e a lista.
- [ ] `PATCH /notificacoes/:id/lida` e `PATCH /notificacoes/lidas` marcam leitura só da conta autenticada.
- [ ] Excluir o animal mantém a notificação com `animal: null`.
- [ ] Editar o animal não cria outra notificação.
