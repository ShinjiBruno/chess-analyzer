import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { parseResult, parseTimeControl } from "../domain/chess.js";
import type { ParsedPgnGame } from "./pgn-parser.js";
import type { ImportedGame } from "./importers.js";
import {
  GameSource,
  GameResult,
  type Prisma,
  type Color,
  type TimeControl,
} from "@prisma/client";

export interface GameFilter {
  opening?: string;
  eco?: string;
  timeControl?: TimeControl;
  result?: GameResult;
  color?: Color; // filtrar partidas em que jogou de brancas/pretas
  source?: GameSource;
  playedSince?: Date;
  playedUntil?: Date;
  query?: string; // busca livre por nome de jogador
  white?: string;
  black?: string;
}

/** Converte um ParsedPgnGame em dados de Game + moves. */
function buildGameData(pgn: ParsedPgnGame, source: GameSource) {
  const result = parseResult(pgn.result);
  return {
    source,
    white: pgn.white,
    black: pgn.black,
    whiteElo: pgn.whiteElo,
    blackElo: pgn.blackElo,
    result,
    resultBy: pgn.resultBy,
    termination: pgn.termination,
    timeControl: parseTimeControl(pgn.timeControlRaw),
    opening: pgn.opening,
    eco: pgn.eco,
    fen: "start", // posição final preenchida a posteriori, quando integrarmos engine
    turns: pgn.moves.length,
    playedAt: pgn.playedAt,
    pgn: pgn.pgn,
    fingerprint: computeFingerprint(pgn),
    isWhiteWin: result === GameResult.WHITE_WIN,
    isBlackWin: result === GameResult.BLACK_WIN,
    isDraw: result === GameResult.DRAW,
  };
}

/** Gera um hash determinístico baseado na sequência de lances e jogadores. */
function computeFingerprint(pgn: ParsedPgnGame): string {
  const norm = [
    pgn.white.trim().toLowerCase(),
    pgn.black.trim().toLowerCase(),
    pgn.result ?? "*",
    pgn.moves.map((m) => m.san.trim().toLowerCase()).join(" "),
  ].join("|");
  return createHash("sha256").update(norm).digest("hex");
}

/** Importa e persiste um conjunto de partidas, com seus lances. */
export async function importGames(
  items: ImportedGame[],
  source: GameSource,
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;
  for (const item of items) {
    const data = buildGameData(item.pgn, source);

    // Evita duplicados: se já existe uma partida com a mesma impressão digital,
    // pula a inserção.
    const existing = await prisma.game.findUnique({
      where: { fingerprint: data.fingerprint },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const game = await prisma.game.create({
      data: {
        ...data,
        ...(item.externalId ? { externalId: item.externalId } : {}),
        ...(item.url ? { url: item.url } : {}),
        moves: {
          create: item.pgn.moves.map((m, i) => ({
            ply: i + 1,
            san: m.san,
            ...(m.uci ? { uci: m.uci } : {}),
            ...(m.comment ? { comment: m.comment } : {}),
          })),
        },
      },
    });
    imported++;
    void game;
  }
  return { imported, skipped };
}

/** Importa via texto PGN colado pelo usuário ou arquivo enviado. */
export async function importFromPgnText(
  pgnText: string,
): Promise<{ imported: number; skipped: number }> {
  const { parseMultiplePgn } = await import("./pgn-parser.js");
  const games = parseMultiplePgn(pgnText);
  const items = games.map((pgn) => ({ pgn }));
  return importGames(items, GameSource.PGN_FILE);
}

/** Importa manualmente uma partida (brand data). */
export async function createManualGame(
  data: ParsedPgnGame & { source?: GameSource },
): Promise<void> {
  await importGames([{ pgn: data }], data.source ?? GameSource.MANUAL);
}

/** Lista partidas com filtros e paginação. */
export async function listGames(
  filter: GameFilter = {},
  page = 1,
  pageSize = 50,
) {
  const where = buildWhere(filter);
  const [total, games] = await Promise.all([
    prisma.game.count({ where }),
    prisma.game.findMany({
      where,
      orderBy: { playedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { moves: true } } },
    }),
  ]);

  return { total, page, pageSize, games };
}

function buildWhere(filter: GameFilter): Prisma.GameWhereInput {
  const where: Prisma.GameWhereInput = {};

  if (filter.opening) where.opening = { contains: filter.opening };
  if (filter.eco) where.eco = { equals: filter.eco };
  if (filter.timeControl) where.timeControl = filter.timeControl;
  if (filter.result) where.result = filter.result;
  if (filter.source) where.source = filter.source;
  if (filter.white) where.white = { contains: filter.white };
  if (filter.black) where.black = { contains: filter.black };

  if (filter.color) {
    // Vitórias/derrotas conforme a cor: usamos OR para englobar ambos lados
    if (filter.color === "WHITE") {
      where.OR = [
        { isWhiteWin: true },
        // derrotas de brancas = vitórias de pretas; mantemos simples:
      ];
    } else {
      where.OR = [{ isBlackWin: true }];
    }
  }

  if (filter.playedSince || filter.playedUntil) {
    where.playedAt = {};
    if (filter.playedSince) where.playedAt.gte = filter.playedSince;
    if (filter.playedUntil) where.playedAt.lte = filter.playedUntil;
  }

  if (filter.query) {
    where.OR = [
      { white: { contains: filter.query } },
      { black: { contains: filter.query } },
      { opening: { contains: filter.query } },
    ];
  }

  return where;
}

export async function getGameById(id: string) {
  return prisma.game.findUnique({
    where: { id },
    include: { moves: { orderBy: { ply: "asc" } } },
  });
}

export async function deleteGame(id: string) {
  return prisma.game.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Estatísticas (UC: Consultar estatísticas)
// ---------------------------------------------------------------------------

export interface StatsFilter {
  username?: string;
  playedSince?: Date;
  playedUntil?: Date;
}

type Outcome = keyof Pick<OutcomeCounts, "wins" | "losses" | "draws" | "unknown">;

interface OutcomeCounts {
  wins: number;
  losses: number;
  draws: number;
  unknown: number;
  total: number;
}

export interface TimeControlStats extends OutcomeCounts {
  timeControl: TimeControl;
}

export interface OpeningStats extends OutcomeCounts {
  eco: string | null;
  opening: string | null;
}

export interface GameStats {
  username: string | null;
  playedSince: Date | null;
  playedUntil: Date | null;
  total: number;
  wins: number;
  losses: number;
  draws: number;
  unknown: number;
  byTimeControl: TimeControlStats[];
  byOpening: OpeningStats[];
}

const TIME_CONTROL_ORDER: TimeControl[] = [
  "BULLET",
  "BLITZ",
  "RAPID",
  "CLASSICAL",
  "CORRESPONDENCE",
  "CUSTOM",
];

interface StatsGameRow {
  white: string;
  black: string;
  result: GameResult;
  isWhiteWin: boolean;
  isBlackWin: boolean;
  isDraw: boolean;
  timeControl: TimeControl;
  eco: string | null;
  opening: string | null;
}

function emptyCounts(): OutcomeCounts {
  return { wins: 0, losses: 0, draws: 0, unknown: 0, total: 0 };
}

/** Classifica o resultado da partida do ponto de vista de um jogador. */
function outcomeFor(game: StatsGameRow, target: string | null): Outcome {
  if (game.result === GameResult.DRAW || game.isDraw) return "draws";
  if (!target) {
    return game.result === GameResult.WHITE_WIN ||
      game.result === GameResult.BLACK_WIN
      ? "wins"
      : "unknown";
  }
  const playingWhite = game.white.trim().toLowerCase() === target;
  const playingBlack = game.black.trim().toLowerCase() === target;
  if (game.result === GameResult.WHITE_WIN) return playingWhite ? "wins" : "losses";
  if (game.result === GameResult.BLACK_WIN) return playingBlack ? "wins" : "losses";
  return "unknown";
}

/** Chave de agrupamento por abertura, respeitando o código ECO dos metadados. */
function openingKey(game: StatsGameRow): string {
  const eco = game.eco?.trim().toUpperCase();
  if (eco) return `eco:${eco}`;
  const opening = game.opening?.trim().toLowerCase();
  if (opening) return `opening:${opening}`;
  return "none";
}

/** Estatísticas agregadas por jogador, modo de jogo e abertura (com ECO). */
export async function getStats(filter: StatsFilter = {}): Promise<GameStats> {
  const where: Prisma.GameWhereInput = {};
  if (filter.playedSince || filter.playedUntil) {
    where.playedAt = {};
    if (filter.playedSince) where.playedAt.gte = filter.playedSince;
    if (filter.playedUntil) where.playedAt.lte = filter.playedUntil;
  }

  const games = await prisma.game.findMany({
    where,
    select: {
      white: true,
      black: true,
      result: true,
      isWhiteWin: true,
      isBlackWin: true,
      isDraw: true,
      timeControl: true,
      eco: true,
      opening: true,
    },
  });

  const username = filter.username?.trim() || null;
  const target = username?.toLowerCase() ?? null;
  const relevant = target
    ? games.filter(
        (g) =>
          g.white.trim().toLowerCase() === target ||
          g.black.trim().toLowerCase() === target,
      )
    : games;

  const totals = emptyCounts();
  const timeControlMap = new Map<TimeControl, OutcomeCounts>();
  const openingMap = new Map<string, OpeningStats>();

  for (const game of relevant) {
    const outcome = outcomeFor(game, target);
    totals[outcome] += 1;
    totals.total += 1;

    // Agrupamento por modo de jogo.
    const tcCounts = timeControlMap.get(game.timeControl) ?? emptyCounts();
    tcCounts[outcome] += 1;
    tcCounts.total += 1;
    timeControlMap.set(game.timeControl, tcCounts);

    // Agrupamento por abertura, respeitando o código ECO.
    const key = openingKey(game);
    let openingStats = openingMap.get(key);
    if (!openingStats) {
      openingStats = {
        eco: game.eco?.trim().toUpperCase() || null,
        opening: game.opening?.trim() || null,
        ...emptyCounts(),
      };
      openingMap.set(key, openingStats);
    }
    openingStats[outcome] += 1;
    openingStats.total += 1;
  }

  const byTimeControl: TimeControlStats[] = TIME_CONTROL_ORDER.filter((tc) =>
    timeControlMap.has(tc),
  )
    .map((tc) => ({ timeControl: tc, ...timeControlMap.get(tc)! }))
    .concat(
      [...timeControlMap.keys()]
        .filter((tc) => !TIME_CONTROL_ORDER.includes(tc))
        .map((tc) => ({ timeControl: tc, ...timeControlMap.get(tc)! })),
    );

  const byOpening: OpeningStats[] = [...openingMap.values()].sort(
    (a, b) =>
      b.total - a.total || (a.eco ?? "").localeCompare(b.eco ?? ""),
  );

  return {
    username,
    playedSince: filter.playedSince ?? null,
    playedUntil: filter.playedUntil ?? null,
    total: totals.total,
    wins: totals.wins,
    losses: totals.losses,
    draws: totals.draws,
    unknown: totals.unknown,
    byTimeControl,
    byOpening,
  };
}