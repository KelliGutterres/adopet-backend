# Spec 006 — Esqueci minha senha (API)

> **Status:** aprovada e implementada.  
> Depende de: spec 003 (auth JWT). Não altera login/cadastro existentes.

## Objetivo

Permitir que **usuário** (mobile) e **ONG** (painel web, admin) redefinam a senha **a partir da tela de login**, informando o **e-mail** e em seguida enviando a **nova senha** via `PUT`, para conseguir autenticar de novo (RF0002 / RF0009, RNF0002).

Fluxo de produto (ambos os canais):

1. Pessoa está na tela de login e não lembra a senha.
2. Informa o **e-mail** da conta.
3. Informa a **nova senha** (e confirmação no cliente).
4. A API atualiza o hash no banco.
5. Pessoa volta ao login com e-mail + senha nova.

Esta fatia é **só API**. Telas web/mobile ficam para specs nos outros repos.

## Escopo

1. Duas rotas públicas (sem JWT) para **usuário**.
2. Duas rotas públicas (sem JWT) para **ONG**.
3. Atualizar `senha` com hash bcrypt (mesmo custo da spec 003: factor `10`).
4. Validação de e-mail e senha mínima alinhada ao cadastro (6 caracteres).
5. Atualizar `docs/CONTEXTO-PROJETO.md` após aprovação + implementação.

## Fora de escopo

- Envio real de e-mail (SMTP, Resend, etc.)
- Token de reset persistido / link mágico / código OTP
- Troca de senha **logada** (`senhaAtual` + `senhaNova` no perfil)
- Edição de perfil (nome, contato, e-mail)
- Recuperação unificada (um único endpoint para os dois papéis)
- Invalidar JWTs já emitidos (não há blacklist hoje)
- Telas Web / Mobile
- Rate limiting / captcha
- Verificação de e-mail no cadastro

## RF/RNF

| ID | Cobertura nesta spec |
|----|----------------------|
| RF0002 | Usuário volta a autenticar após redefinir senha |
| RF0009 | ONG volta a autenticar após redefinir senha |
| RF0001 | **Parcial** — só o campo senha; não é edição de perfil |
| RNF0002 | Senha continua só com hash; nunca retornada |

## Contexto técnico (hoje)

Já existe (spec 003):

| Papel | Cadastro | Login | Tabela |
|-------|----------|--------|--------|
| `usuario` | `POST /auth/usuarios/cadastro` | `POST /auth/usuarios/login` | `Usuario` |
| `ong` | `POST /auth/ongs/cadastro` | `POST /auth/ongs/login` | `Instituicao` |

- E-mail é único **por tabela**, não global: o mesmo e-mail pode existir em Usuario e em Instituicao.
- Por isso as rotas de recuperação **precisam ser separadas** (mobile vs painel). O cliente escolhe o fluxo pelo canal.
- Não há campo de token de reset no schema.
- `GET /auth/me` e mutações de animais exigem JWT; **esqueci a senha não**: a pessoa não está autenticada.

## Fluxo — opção A

A tela “Esqueci minha senha” coleta e-mail e nova senha e chama um único `PUT`.

```
Cliente                         API
   |                             |
   |  PUT /auth/usuarios/senha   |
   |  { email, senha }           |
   |---------------------------->|
   |  204 (hash atualizado)      |
   |<----------------------------|
   |  POST /auth/usuarios/login  |
   |  { email, senha nova }      |
   |---------------------------->|
```

ONG: o mesmo, em `/auth/ongs/senha`.

**Limitação (MVP TCC):** qualquer pessoa que souber o e-mail cadastrado consegue trocar a senha. Sem SMTP nesta fatia. Evolução futura: opção C (e-mail de verdade) sem mudar a ideia do `PUT` — só o fator de autorização.

---

## Contratos de API

Prefixo: `/auth`  
Rotas **públicas** (sem `Authorization`).  
Sucesso **não** devolve `senha` nem JWT (a pessoa deve logar de novo).  
Envelope de erro atual: `{ error: { message } }`.

### `PUT /auth/usuarios/senha`

Redefine a senha de um **Usuario** identificado pelo e-mail.

**Body**

```json
{
  "email": "maria@email.com",
  "senha": "novaSenha123"
}
```

| Campo | Regra |
|-------|--------|
| `email` | obrigatório; normalizar trim + lowercase (igual login) |
| `senha` | obrigatória; mínimo **6** caracteres (igual cadastro) |

**204** No Content — senha atualizada; corpo vazio.

**Erros**

| Status | Quando |
|--------|--------|
| `400` | e-mail inválido; senha ausente ou &lt; 6 |
| `404` | e-mail não encontrado em `Usuario` |

### `PUT /auth/ongs/senha`

Mesmo contrato, tabela `Instituicao`.

**Body:** `{ "email", "senha" }`  
**204** / **400** / **404** (e-mail não encontrado em `Instituicao`).

Um e-mail que existe só como usuário **não** redefine a ONG, e vice-versa.

### Confirmação de senha

`senhaConfirmacao` **não** entra na API. O cliente (web/mobile) compara os dois campos e só dispara o `PUT` se forem iguais.

### Por que `PUT` e não `PATCH`

O recurso é a senha da conta identificada pelo e-mail: substituição completa do hash. Não há `POST` paralelo nesta fatia.

### Por que não devolver token no sucesso

O critério de pronto é **conseguir fazer login**. Forçar `POST /auth/.../login` com a senha nova valida o fluxo ponta a ponta.

---

## Regras de negócio

1. Hash com `bcryptjs`, cost `10` — reutilizar `hashSenha` do `auth.service`.
2. Nunca logar senha em texto puro.
3. E-mail inexistente → **404** com mensagem genérica (`E-mail não encontrado`).
4. Não alterar `nome`, `contato`, `status`, `idCidade`.
5. JWTs antigos continuam válidos até expirar (`JWT_EXPIRES_IN`, hoje `7d`). Fora de escopo invalidá-los.
6. Idempotência: dois `PUT` seguidos com a mesma senha nova são ok (re-hash).

## Autorização

| Rota | Auth |
|------|------|
| `PUT /auth/usuarios/senha` | público |
| `PUT /auth/ongs/senha` | público |
| Login / cadastro existentes | inalterados |

Não usar `authenticate` nestas rotas: quem esqueceu a senha não tem JWT.

## Modelo de dados

**Sem migration.** Continua `Usuario.senha` / `Instituicao.senha` (`VarChar(100)`, hash).

## Arquitetura de código

Camadas atuais: rotas → controllers → services → Prisma.

```
src/routes/auth.routes.js          # + 2 rotas PUT
src/controllers/auth.controller.js # redefinirSenhaUsuario, redefinirSenhaOng
src/services/auth.service.js       # redefinirSenhaUsuario, redefinirSenhaOng
```

## Coleção Postman

Incluir os dois `PUT` em `docs/postman/AdoPet-Auth-Animais.postman_collection.json`, depois login com a senha nova.

## Decisões fechadas na implementação

1. **Opção A** — um `PUT` com `{ email, senha }` (sem token, sem SMTP)
2. E-mail inexistente → **404** `E-mail não encontrado`
3. Sucesso → **204** vazio
4. Rotas: `PUT /auth/usuarios/senha` e `PUT /auth/ongs/senha`
5. Campo do body: `senha` (igual cadastro/login)
6. Sem `POST` de “iniciar recuperação”
7. Confirmação de senha só no cliente
8. E-mail duplicado Usuario↔ONG: cada PUT mexe só na sua tabela

## Critérios de pronto

- [x] Spec aprovada (pontos 1–6 fechados — opção A)
- [x] `PUT /auth/usuarios/senha` atualiza hash; login usuário funciona com a senha nova
- [x] `PUT /auth/ongs/senha` idem para ONG
- [x] `PUT` com e-mail de usuário **não** altera senha da ONG (e o contrário)
- [x] Senha &lt; 6 → `400`; e-mail inválido → `400`; e-mail inexistente → `404`
- [x] Resposta nunca inclui `senha`
- [x] Cadastro/login atuais regressão ok
- [x] Postman atualizado
- [x] `docs/CONTEXTO-PROJETO.md` atualizado (checklist + decisões + pendência)

## Como validar

```bash
# seed: usuario@adopet.local / ong@adopet.local — senha123

curl -X PUT http://localhost:3000/auth/usuarios/senha \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@adopet.local","senha":"nova123"}'

# espera 204; depois login deve falhar com senha123 e passar com nova123

curl -X POST http://localhost:3000/auth/usuarios/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@adopet.local","senha":"nova123"}'

# repetir o par PUT + login em /auth/ongs/senha e /auth/ongs/login
```

## Checklist de implementação

1. Funções no `auth.service` (buscar por e-mail → hash → `update`)
2. Controllers + rotas `PUT`
3. Postman
4. CONTEXTO (decisão na tabela §8; pendência de recuperação de senha)
5. Não criar spec web/mobile nesta fatia
