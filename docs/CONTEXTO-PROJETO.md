# AdoPet — Documento de Contexto (TCC Parte 2)

> **Como usar este documento com a IA:**  
> Em toda sessão, referencie `docs/CONTEXTO-PROJETO.md` ou confie nas regras em `.cursor/rules/`.  
> Fonte da especificação: TCC I — 2026A (Kelli), capítulo 4 — Métodos e Materiais.  
> Atualize seções e a tabela de decisões quando houver novas escolhas técnicas.

---

## 1. Visão geral

| Item | Descrição |
|------|-----------|
| **Nome** | AdoPet |
| **Tipo** | TCC — Parte 2 (implementação prática) |
| **Objetivo** | Gerenciamento de animais e promoção da adoção responsável; também apoio a animais **perdidos** e **encontrados**, com comparação de imagens por IA |
| **Caráter da pesquisa** | Aplicada, desenvolvimento tecnológico; exploratória e descritiva; experimental; abordagem qualitativa |
| **Idioma UI** | Português (Brasil) |
| **Idioma código** | Inglês para identificadores técnicos; mensagens de erro/UI em PT-BR |

### Papéis (atores)

Há **dois atores** de negócio. A ONG **é** o administrador do sistema — não existe um terceiro papel “Admin” separado.

| Papel | Canal principal | Responsabilidades |
|-------|-----------------|-------------------|
| **Usuário** | Mobile (React Native) | Cadastro/login; cadastro e consulta de animais perdidos, encontrados e para adoção; upload/captura de imagens; comparação inteligente de similaridade |
| **ONG** (administrador) | Web (React) | Autenticação no painel; CRUD de animais; gerenciamento de registros/usuários conforme casos de uso da Parte 1 |
| **Sistema (API)** | Backend (Node.js) | Regras de negócio, autenticação, PostgreSQL, upload via Supabase, integração com serviço de IA |
| **Serviço de IA** | Python (pasta em `adopet-backend`) | Comparação de similaridade entre imagens de animais perdidos/encontrados |

> **Nota:** no código/JWT, o papel da ONG pode ser representado como `ong` (ou equivalente). Evitar criar role `admin` aparte, salvo necessidade futura explícita. O mobile é o canal do usuário; o web é o painel da ONG. Ambos consomem a mesma API REST.

---

## 2. Arquitetura da solução

Conforme a Parte 1 (arquitetura em serviços / API REST):

```
┌──────────────────────┐   ┌──────────────────────┐
│ Mobile (React Native)│   │ Web (React)          │
│ Usuário              │   │ ONG (admin do painel)│
└──────────┬───────────┘   └──────────┬───────────┘
           │  HTTP REST                │
           └────────────┬─────────────┘
                        ▼
           ┌────────────────────────┐
           │ Backend (Node.js)      │
           │ Regras + Auth + API    │
           └─────┬──────────┬───────┘
                 │          │
       ┌─────────▼──┐   ┌───▼────────────────┐
       │ PostgreSQL │   │ Supabase Storage   │
       │ dados      │   │ imagens (URLs no DB)│
       └────────────┘   └────────────────────┘
                        │
                 ┌──────▼──────────┐
                 │ Serviço IA      │
                 │ Python          │
                 │ (similaridade)  │
                 └─────────────────┘
```

### Organização: 3 repositórios separados (decidido)

Cada parte do sistema terá seu próprio repositório Git. Manter este documento de contexto espelhado (ou referenciado) em cada repo, ou centralizado no repo principal de documentação.

| Repositório | Conteúdo |
|-------------|----------|
| `adopet-backend` | Node.js — API REST **+** serviço de IA em Python (pasta interna, ex.: `ai/` ou `ai-service/`) |
| `adopet-web` | React — painel da ONG (administração) |
| `adopet-mobile` | React Native — usuário |

Estrutura sugerida do backend (quando a fase de IA começar):

```
adopet-backend/
├── src/                 # API Node.js
├── ai/                  # Python — comparação de imagens
├── docs/
└── ...
```

> Este workspace atual (`AdoPetMobile-main`) pode ser o ponto de partida do mobile ou da documentação; ao criar os outros repos, copiar/adaptar `docs/CONTEXTO-PROJETO.md` e `.cursor/rules/`.

---

## 3. Escopo funcional (checklist de implementação)

### Mobile (usuário)
- [ ] Cadastro e edição de conta (dados pessoais, e-mail, senha) — RF0001
- [ ] Login (e-mail/senha) — RF0002
- [ ] Cadastro/edição/exclusão de animais (nome, espécie, raça, idade, descrição, status, imagens) — RF0003
- [ ] Listagem: adoção, perdidos, localizados/encontrados — RF0004
- [ ] Filtros: situação, espécie, porte, idade, localização, status — RF0005
- [ ] Detalhes do animal (fotos, descrição, localização) — RF0006
- [ ] Upload por galeria ou câmera — RF0007
- [ ] Comparação inteligente de imagens — RF0008
- [ ] Telas de protótipo: autenticação/cadastro; listagem de animais

### Web (ONG = administrador do painel)
- [ ] Autenticação da ONG (e-mail/senha) — RF0009
- [ ] Painel de gerenciamento de animais — RF0010
- [ ] CRUD de animais para adoção (cadastro, edição, exclusão) — RF0003 / protótipos Fig. 16–17
- [ ] Gerenciamento de usuários e registros de animais (casos de uso da ONG na Parte 1)
- [ ] Telas de protótipo: login web; cadastro de animal; edição/gerenciamento

### Backend (Node.js)
- [ ] API REST centralizando regras de negócio
- [ ] Auth usuário e ONG; senhas criptografadas (RNF0002)
- [ ] CRUD usuários, instituições/ONGs, animais, etc.
- [ ] Integração Supabase Storage (upload/recuperação; salvar só URL/referência no PostgreSQL)
- [ ] Integração com serviço Python de comparação de imagens
- [ ] Filtros e listagens conforme RF0004–RF0006

### Serviço de IA (Python — dentro de `adopet-backend`)
- [ ] Pasta `ai/` (ou similar) no mesmo repositório do backend
- [ ] Receber imagem enviada pelo usuário (via API Node)
- [ ] Comparar com imagens já cadastradas
- [ ] Retornar similaridades / candidatos ao backend Node

---

## 4. Especificação técnica (TCC Parte 1)

### 4.1 Stack

| Camada | Tecnologia | Papel |
|--------|------------|--------|
| Mobile | React Native | App multiplataforma Android/iOS |
| Web | React (ReactJS) | Painel da ONG; UI responsiva |
| Backend | Node.js | Regras de negócio, auth, orquestração, API REST |
| Banco | PostgreSQL | Dados estruturados (usuários, animais, etc.) |
| Storage | Supabase Storage | Imagens; referências/URLs no PostgreSQL |
| IA | Python | Similaridade de imagens (visão computacional) |
| Libs IA (referência) | TensorFlow, PyTorch, OpenCV | Ecossistema citado na Parte 1 |
| Persistência | **Prisma** (ORM) | Schema Prisma + migrações; cliente tipado sobre PostgreSQL |
| Auth | **JWT** | E-mail/senha; token JWT; senhas com hash (bcrypt ou similar) |

### 4.2 Requisitos funcionais

| ID | Nome | Descrição | Prioridade |
|----|------|-----------|------------|
| RF0001 | Manter Usuário | Cadastro e edição de conta (dados pessoais, e-mail, senha) | Obrigatória |
| RF0002 | Autenticar Usuário | Login com e-mail e senha | Obrigatória |
| RF0003 | Manter Animais | ONGs e usuários cadastram, editam e excluem animais (nome, espécie, raça, idade, descrição, status, imagens) | Obrigatória |
| RF0004 | Listagem de Animais | Lista de animais para adoção, perdidos e localizados | Obrigatória |
| RF0005 | Filtros de Busca | Filtrar por situação, espécie, porte, idade, localização e status | Obrigatória |
| RF0006 | Detalhes do Animal | Fotos, descrição, localização e demais informações | Obrigatória |
| RF0007 | Upload e Captura de Imagens | Galeria ou câmera do dispositivo | Obrigatória |
| RF0008 | Comparação Inteligente de Imagens | Enviar imagem e comparar automaticamente com as já cadastradas | Obrigatória |
| RF0009 | Autenticar ONG | Login e-mail/senha no painel administrativo | Obrigatória |
| RF0010 | Painel Administrativo da ONG | Painel web para gerenciamento de animais | Obrigatória |

### 4.3 Requisitos não funcionais

| ID | Nome | Descrição | Prioridade |
|----|------|-----------|------------|
| RNF0001 | Usabilidade | Interface intuitiva em mobile e web | Obrigatória |
| RNF0002 | Segurança | Auth segura, criptografia de senhas, proteção de dados | Obrigatória |
| RNF0003 | Disponibilidade | 24/7, exceto manutenções programadas | Obrigatória |
| RNF0004 | Armazenamento de Imagens | Seguro e escalável (Supabase Storage) | Obrigatória |
| RNF0005 | Escalabilidade | Crescer em usuários, animais e imagens | Obrigatória |
| RNF0006 | Responsividade | Web adapta a diferentes resoluções | Obrigatória |

### 4.4 Modelo de dados

O MER da Parte 1 (Figura 11) contempla entidades relacionadas a:

- **Usuários**
- **Instituições / ONGs**
- **Animais** (adoção, perdidos, encontrados)
- **Raças**
- **Cidades** (localização)
- **Comparação de imagens / IA** (registros do processo de similaridade)

Atributos citados nos requisitos para **Animal**: nome, espécie, raça, idade, descrição, status, situação, porte, localização, imagens.

#### O que a IA precisa para detalhar as tabelas

Qualquer **uma** destas opções basta (quanto mais legível, melhor):

1. **Print/foto nítida** do diagrama ER (Figura 11) — anexar no chat ou em `docs/mer.png`
2. **Lista em texto** por tabela, no formato:
   ```
   Tabela: Animal
   - id (PK)
   - nome (varchar)
   - especie_id (FK → Especie)
   - ...
   Relacionamentos: Animal N:1 Ong; Animal N:N Imagem; ...
   ```
3. **Export** do brModelo / dbdiagram / draw.io / PostgreSQL (`\d` ou script SQL)

Com isso, a seção abaixo será preenchida com PK/FK, tipos e cardinalidade. Até lá, o MVP de CRUD usará um schema mínimo alinhado aos RFs (usuário, ong, animal + campos essenciais).

### 4.5 Casos de uso

**Usuário**
- Manter conta / autenticar
- Manter e consultar animais (perdidos, encontrados, adoção)
- Enviar imagens e solicitar comparação por IA

**ONG** (administrador do sistema/painel)
- Gerenciar usuários
- Cadastrar/administrar animais para adoção
- Administrar registros de animais no sistema

### 4.6 Regras de negócio / princípios técnicos

1. Imagens **não** ficam no PostgreSQL como blob; vão ao **Supabase Storage**; o banco guarda **referência/URL**.
2. Upload/recuperação de imagens passa pelo **backend Node.js** (não expor secrets do Supabase no cliente sem critério).
3. Comparação de imagens é responsabilidade do **serviço Python**, orquestrado pelo backend.
4. Status/situação do animal distingue pelo menos: **adoção**, **perdido**, **localizado/encontrado**.
5. ONGs e usuários podem manter animais (RF0003), com permissões por papel (`usuario` | `ong`). A ONG é o admin — sem role admin separado.
6. Senhas devem ser armazenadas com **hash** (nunca texto puro).

### 4.7 Protótipos de interface (referência visual)

| Figura | Ambiente | Tela |
|--------|----------|------|
| 13 | Mobile | Autenticação e cadastro |
| 14 | Web | Autenticação |
| 15 | Mobile | Listagem de animais |
| 16 | Web | Cadastro de animal para adoção |
| 17 | Web | Edição/gerenciamento de animal |

---

## 5. Instruções para a IA (obrigatório seguir)

1. Ler este documento antes de propor arquitetura, pastas ou código significativo.
2. Seguir boas práticas e a estrutura de pastas do repositório.
3. Separar Mobile ≠ Web ≠ Backend; o módulo Python de IA vive **dentro** do repo `adopet-backend`, com contrato claro entre Node e Python.
4. Não inventar requisitos fora deste doc/conversa; se faltar decisão, perguntar ou marcar `[A DECIDIR]`.
5. Responder em **português**.
6. Entregar de forma **incremental** (fatias funcionais).
7. Commits **somente** quando o autor pedir.
8. Ao fechar decisões (Prisma, JWT, endpoints, schema), **atualizar este arquivo**.
9. Priorizar alinhamento com RF/RNF da Parte 1.
10. Tratar RF0008 (IA) como módulo isolado **dentro do backend** — pode vir depois de auth + CRUD + storage no MVP incremental.

### Modelo de prompt

```
Contexto: seguir docs/CONTEXTO-PROJETO.md e .cursor/rules/

Tarefa: [o que fazer]
Escopo: [mobile | web | backend]
RF/RNF relacionados: [ex.: RF0004, RNF0002]
Restrições: [ex.: não alterar auth]
Critério de pronto: [comportamento verificável]
```

---

## 6. Boas práticas e padrões de código

### Gerais
- Código legível; funções pequenas; sem secrets no repositório.
- Validar na borda (rotas/controllers e formulários).
- Erros explícitos; mensagens úteis sem vazar detalhes internos.
- `.env` + `.env.example`; nunca commitar credenciais.

### Nomenclatura
- Componentes React/RN: PascalCase.
- Funções/variáveis: camelCase.
- Constantes: UPPER_SNAKE_CASE.
- Rotas API: REST no plural (`/animais`, `/ongs`, `/usuarios`).

### Backend (Node.js)
- Camadas: rotas → controllers → services → acesso a dados via **Prisma**.
- Schema em `prisma/schema.prisma`; evoluir o banco com migrações (`prisma migrate`).
- Não misturar SQL cru sem necessidade; se precisar de query raw pontual, documentar o motivo.
- Middlewares de auth/autorização por papel (`usuario` | `ong`).
- Resposta HTTP consistente (sucesso + erro padronizado).

### Web (React)
- Componentes funcionais; páginas / componentes / serviços / hooks.
- Painel da ONG focado em gestão (CRUD), responsivo (RNF0006).

### Mobile (React Native)
- Organização por feature quando possível.
- Loading, empty state e erro em listas.
- Câmera/galeria para RF0007.

### IA (Python, pasta dentro do backend)
- Endpoint(s) claros de comparação; contrato JSON documentado.
- Chamado pelo Node.js do mesmo repositório; sem acoplamento direto ao frontend.

### Git
- Commits curtos no imperativo (`feat: adiciona listagem de animais`).
- Sem commit sem pedido do autor.

---

## 7. Roadmap e MVP (Parte 2)

### Fase 1 — MVP básico (prioridade atual)

Foco: **cadastro, edição e exclusão** (CRUD), com autenticação JWT.

1. Fundação dos repositórios separados (`backend`, `web`, depois `mobile`)
2. Backend + PostgreSQL + schema mínimo
3. Auth JWT — usuário e/ou ONG (RF0001, RF0002, RF0009)
4. CRUD de animais na API + painel Web (RF0003, RF0010)
5. Listagem/detalhe básicos para validar o fluxo

### Fase 2 — demais funcionalidades (depois do CRUD)

6. Storage Supabase (imagens)
7. Filtros avançados, perdidos/encontrados no mobile
8. Upload/câmera (RF0007)
9. Serviço de IA (RF0008)
10. Polimento + documentação para a banca

---

## 8. Decisões técnicas registradas

| Data | Decisão | Motivo |
|------|---------|--------|
| 2026-07-27 | Mobile RN + Web React + Backend Node.js | Parte 1 / autor |
| 2026-07-27 | PostgreSQL como banco | Parte 1 |
| 2026-07-27 | Supabase Storage para imagens | Parte 1 |
| 2026-07-27 | Python para comparação de imagens | Parte 1 |
| 2026-07-27 | API REST como integração central | Parte 1 |
| 2026-07-27 | Auth com **JWT** | Decisão do autor |
| 2026-07-27 | **3 repositórios** (`backend`, `web`, `mobile`); IA Python dentro do backend | Decisão do autor |
| 2026-07-27 | MVP = CRUD (criar/editar/excluir) antes do restante | Decisão do autor |
| 2026-07-27 | Persistência com **Prisma** (ORM) sobre PostgreSQL | Decisão do autor |
| 2026-08-02 | Apenas 2 atores: **Usuário** e **ONG** (ONG = admin; sem role admin separado) | Decisão do autor |

---

## 9. Pendências

- [ ] Detalhar MER (Figura 11): print, lista de campos ou SQL — ver seção 4.4
- [x] Persistência: Prisma (ORM)
- [x] Auth: JWT
- [x] 3 repositórios separados (IA no backend)
- [x] MVP: CRUD primeiro
- [ ] Padronizar envelope de resposta da API e códigos de erro
- [ ] Anexar protótipos/diagramas em `docs/` (opcional)

---

## 10. Histórico

| Data | Alteração |
|------|-----------|
| 2026-07-27 | Criação inicial do documento de contexto |
| 2026-07-27 | Incorporação da Parte 1 (cap. 4): stack, RF/RNF, arquitetura, atores, protótipos, Supabase e IA |
| 2026-07-27 | Decisões: JWT, 3 repos (IA no backend), MVP=CRUD; instruções para detalhar o MER |
| 2026-07-27 | Ajuste: `adopet-ai-service` unificado ao `adopet-backend` |
| 2026-07-27 | Decisão: Prisma como ORM |
| 2026-08-02 | Atores: Usuário e ONG (ONG é o admin) |
