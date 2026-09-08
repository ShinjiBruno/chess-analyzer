# Chess Analyzer — Documento de Requisitos

> Projeto: Analisador de partidas de xadrez (chessbase pessoal)

Obs.: Anotação ainda incompleta

---

## 1. Questões

### 1.1 Questões Organizacionais

1. Qual é o público-alvo do sistema? (Resposta: uso pessoal, enxadrista que quer montar sua própria base de estudo.)
2. Quem será o responsável pela manutenção do software e com que frequência será atualizado?
3. O software será utilizado em uma única máquina ou em múltiplos dispositivos simultaneamente?
4. Existe necessidade de múltiplos usuários/perfis no sistema?
5. Há requisitos de conformidade ou políticas organizacionais que o projeto deva atender?
6. Quais processos de trabalho o sistema deve apoiar (importação, revisão, estudo)?
7. Quem decide as prioridades de novas funcionalidades e critérios de aceite?

### 1.2 Questões Econômicas

1. Qual é o orçamento disponível para desenvolvimento e manutenção do projeto?
2. Haverá custos com infraestrutura (servidores, banco de dados) ou o sistema será 100% local?
3. Existe previsão de monetização futura ou o projeto é sem fins lucrativos (uso próprio)?
4. Qual o custo de eventuais integrações com serviços externos (chess.com, lichess, engine)?
5. Qual o custo de treinamento do usuário à ferramenta?
6. Qual o retorno esperado (tempo economizado em análise, melhoria de desempenho)?
7. Qual o custo de armazenamento e backups da base de partidas?

### 1.3 Questões Técnicas

1. Quais linguagens, frameworks e bibliotecas serão utilizados (Node.js, TypeScript, Prisma, Angular)?
2. Qual banco de dados será adotado e qual o modelo de dados?
3. Como serão integradas as APIs públicas do chess.com e lichess.org (rate limits, autenticação)?
4. Haverá integração com engine de análise (Stockfish) no backend?
5. Como será organizado o versionamento e o deploy (Docker, docker-compose, monorepo)?
6. Quais requisitos de desempenho e escalabilidade são esperados?
7. Como será tratada a segurança (ausência de autenticação, acesso local)?

### 1.4 Questões Operacionais

1. Como o usuário importará partidas (conta online, arquivo PGN, manual)?
2. Quais filtros de busca e métricas serão necessários para localizar partidas?
3. Como serão apresentados os resultados das análises e estatísticas?
4. Qual o fluxo de criação e edição de estudos e anotações?
5. Como será feito o backup e a recuperação dos dados?
6. Qual o processo de atualização/evolução do software?
7. Como o usuário será amparado em caso de erros ou falhas (logs, mensagens)?

---

## 2. Requisitos Funcionais (RF)

| ID | Descrição |
|----|-----------|
| RF01 | Importar partidas da conta do chess.com (últimas N partidas, por abertura, vitórias, derrotas, cor, etc.). |
| RF02 | Importar partidas da conta do lichess.org. |
| RF03 | Importar partidas a partir de arquivo PGN (individual ou múltiplas). |
| RF04 | Cadastrar partida manualmente. |
| RF05 | Listar e filtrar partidas por abertura, ECO, modo de jogo, resultado, cor, origem, jogador e período. |
| RF06 | Visualizar os detalhes de uma partida, incluindo todos os lances (SAN) e o PGN original. |
| RF07 | Excluir uma partida da base. |
| RF08 | Visualizar estatísticas agregadas (total, vitórias, derrotas, empates, por modo e por abertura). |
| RF09 | Criar, listar e excluir estudos. |
| RF10 | Vincular um estudo a uma partida. |
| RF11 | Criar capítulos dentro de um estudo (com posição inicial FEN e variante PGN). |
| RF12 | Adicionar anotações (setas, círculos, destaques e textos) em capítulos. |
| RF13 | Excluir capítulos e anotações. |

## 3. Requisitos Não Funcionais (RNF)

| ID | Descrição |
|----|-----------|
| RNF01 | Desempenho: listagens e filtros devem responder em menos de 200 ms para bases típicas pessoais. |
| RNF02 | Disponibilidade: o backend deve estar disponível localmente durante o uso da ferramenta. |
| RNF03 | Portabilidade: empacotamento via Docker (Dockerfile + docker-compose) para front e back. |
| RNF04 | Manutenibilidade: código em TypeScript com tipagem estrita e separação em camadas (rotas, serviços, domínio). |
| RNF05 | Escalabilidade: o modelo de dados deve suportar milhares de partidas sem degradação relevante. |
| RNF06 | Usabilidade: interface amigável para enxadristas, com tabuleiro visual e anotações. |
| RNF07 | Segurança: sem autenticação (uso pessoal), mas com validação de entrada e tratamento de erros. |
| RNF08 | Compatibilidade: frontend Angular moderno, backend Node.js 20+, banco SQLite. |

## 4. Restrições de Projeto

| ID | Descrição |
|----|-----------|
| R01 | Sem autenticação/cadastro de usuários (projeto de uso pessoal). |
| R02 | Banco de dados SQLite (arquivo local), acessado via Prisma ORM. |
| R03 | Backend em Node.js + TypeScript, framework Fastify. |
| R04 | Frontend em Angular (já iniciado com tabuleiro e regras via chess.js + cm-chessboard). |
| R05 | Estrutura monorepo com `back/` e `front/`. |
| R06 | Uso de APIs públicas do chess.com e lichess.org sem chave de API (somente leitura). |
| R07 | Análise por engine (Stockfish) fora do escopo inicial. |
| R08 | Deploy final via Docker e docker-compose na raiz do monorepo. |

## 5. Requisitos de Experiência do Usuário (UX)

| ID | Descrição |
|----|-----------|
| UX01 | O usuário deve conseguir importar partidas em poucos cliques a partir de sua conta. |
| UX02 | Filtros devem ser intuitivos e combináveis, com retorno rápido. |
| UX03 | A visualização da partida deve permitir navegar lance a lance no tabuleiro. |
| UX04 | Anotações visuais (setas/círculos) devem ser simples de desenhar e remover. |
| UX05 | As estatísticas devem usar representações claras (totais e por categoria). |
| UX06 | Mensagens de erro devem ser claras (ex.: usuário não encontrado, partida inválida). |

---

## 6. Casos de Uso

### UC01 — Importar partidas do chess.com
- **Ator:** Enxadrista (usuário)
- **Pré-condição:** Usuário informa o username e o backend tem acesso à internet.
- **Fluxo principal:**
  1. Usuário informa o username e a quantidade/filtros de partidas desejados.
  2. Sistema consulta a API pública do chess.com.
  3. Sistema faz o parsing dos PGNs e persiste as partidas e lances.
  4. Sistema confirma a quantidade de partidas importadas.
- **Pós-condição:** Partidas disponíveis para busca e análise.

### UC02 — Importar partidas do lichess.org
- **Ator:** Enxadrista
- **Fluxo principal:**
  1. Usuário informa o username e a quantidade desejada.
  2. Sistema consulta a API do lichess.org.
  3. Sistema faz o parsing e persiste.
  4. Sistema confirma a importação.
- **Pós-condição:** Partidas disponíveis.

### UC03 — Filtrar e buscar partidas
- **Ator:** Enxadrista
- **Fluxo principal:**
  1. Usuário acessa a lista de partidas.
  2. Usuário aplica filtros (abertura, modo, resultado, cor, período, jogador).
  3. Sistema retorna as partidas correspondentes com paginação.
  4. Usuário seleciona uma partida para visualizar.
- **Pós-condição:** Partidas filtradas exibidas.

### UC04 — Visualizar/analisar uma partida
- **Ator:** Enxadrista
- **Fluxo principal:**
  1. Usuário abre uma partida.
  2. Sistema exibe metadados, lances (SAN) e PGN.
  3. Usuário navega entre os lances no tabuleiro.
- **Pós-condição:** Partida compreendida para estudo.

### UC05 — Criar estudo com anotações
- **Ator:** Enxadrista
- **Fluxo principal:**
  1. Usuário cria um estudo (nome/descrição, opcionalmente vinculado a uma partida).
  2. Usuário cria capítulos com posição inicial (FEN) e variante (PGN).
  3. Usuário adiciona anotações visuais e textuais aos capítulos.
  4. Sistema persiste o estudo, capítulos e anotações.
- **Pós-condição:** Estudo disponível para revisão.

### UC06 — Consultar estatísticas
- **Ator:** Enxadrista
- **Fluxo principal:**
  1. Usuário acessa o painel de estatísticas.
  2. Sistema calcula totais, vitórias/derrotas/empates e agrupamentos por modo e abertura.
- **Pós-condição:** Estatísticas exibidas.

---

## 7. Modelo de Dados (visão geral)

- **Game** — partida (jogadores, elo, resultado, modo, abertura, ECO, FEN final, PGN, origem, data).
- **Move** — lance individual (ply, SAN, UCI, FEN antes/depois, comentário).
- **Study** — estudo (nome, descrição, tags, partida vinculada opcional).
- **Chapter** — capítulo (posição FEN inicial, variante PGN).
- **Annotation** — anotação (tipo: seta/círculo/destaque/texto; casas; cor; texto).

---

## 8. Como executar o backend

```bash
cd back
npm install
npx prisma generate
npx prisma migrate dev   # cria obanco SQLite
npm run dev              
```

Endpoints principais:
- `GET /health`
- `GET /games` 
- `GET /games/stats`
- `GET /games/:id`
- `POST /games/import/pgn`
- `POST /games/import/chesscom`
- `POST /games/import/lichess`
- `GET/POST /studies`, `GET/DELETE /studies/:id`
- `POST /studies/:id/chapters`, `DELETE /chapters/:id`
- `POST /chapters/:id/annotations`, `DELETE /annotations/:id`