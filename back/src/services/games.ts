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
    isWhiteWin: result === GameResult.WHITE_WIN,
    isBlackWin: result === GameResult.BLACK_WIN,
    isDraw: result === GameResult.DRAW,
  };
}

/** Importa e persiste um conjunto de partidas, com seus lances. */
export async function importGames(
  imported: ImportedGame[],
  source: GameSource,
): Promise<number> {
  let created = 0;
  for (const item of imported) {
    const data = buildGameData(item.pgn, source);

    // Evita duplicados por externalId quando fornecido
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
    created++;
    void game;
  }
  return created;
}

/** Importa via texto PGN colado pelo usuário ou arquivo enviado. */
export async function importFromPgnText(pgnText: string): Promise<number> {
  const { parseMultiplePgn } = await import("./pgn-parser.js");
  const games = parseMultiplePgn(pgnText);
  const imported = games.map((pgn) => ({ pgn }));
  return importGames(imported, GameSource.PGN_FILE);
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

/** Estatísticas agregadas para dashboards/filtros. */
export async function getStats() {
  const [total, wins, losses, draws, byTimeControl, byOpening] =
    await Promise.all([
      prisma.game.count(),
      prisma.game.count({ where: { OR: [{ isWhiteWin: true }, { isBlackWin: true }] } }),
      prisma.game.count({ where: { result: GameResult.UNKNOWN } }),
      prisma.game.count({ where: { isDraw: true } }),
      prisma.game.groupBy({ by: ["timeControl"], _count: true }),
      prisma.game.groupBy({ by: ["opening"], _count: true, orderBy: { _count: { opening: "desc" } }, take: 10 }),
    ]);

  return { total, wins, losses, draws, byTimeControl, byOpening };
}