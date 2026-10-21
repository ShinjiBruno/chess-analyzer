import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { GameResult, GameSource, TimeControl, Color } from "@prisma/client";
import {
  deleteGame,
  getGameById,
  listGames,
  getStats,
  importFromPgnText,
  importGames,
} from "../services/games.js";
import { importChessCom, importLichess } from "../services/importers.js";

const listQuerySchema = z.object({
  opening: z.string().optional(),
  eco: z.string().optional(),
  timeControl: z.nativeEnum(TimeControl).optional(),
  result: z.nativeEnum(GameResult).optional(),
  color: z.nativeEnum(Color).optional(),
  source: z.nativeEnum(GameSource).optional(),
  white: z.string().optional(),
  black: z.string().optional(),
  query: z.string().optional(),
  playedSince: z.coerce.date().optional(),
  playedUntil: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const statsQuerySchema = z.object({
  username: z.string().optional(),
  playedSince: z.coerce.date().optional(),
  playedUntil: z.coerce.date().optional(),
});

const importChessComSchema = z.object({
  username: z.string().min(1),
  maxGames: z.number().int().min(1).max(500).default(20),
  isWin: z.boolean().nullable().optional(),
  color: z.nativeEnum(Color).nullable().optional(),
  timeControl: z.nativeEnum(TimeControl).nullable().optional(),
});

export async function gameRoutes(app: FastifyInstance) {
  app.get("/games", async (req, reply) => {
    const query = listQuerySchema.parse(req.query);
    const { page, pageSize, ...filter } = query;
    const result = await listGames(filter, page, pageSize);
    return result;
  });

  app.get("/games/stats", async (req) => {
    const query = statsQuerySchema.parse(req.query);
    return getStats(query);
  });

  app.get("/games/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const game = await getGameById(id);
    if (!game) return reply.code(404).send({ error: "Partida não encontrada" });
    return game;
  });

  app.delete("/games/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await deleteGame(id);
    return reply.code(204).send();
  });

  app.post("/games/import/pgn", async (req, reply) => {
    const body = z.object({ pgn: z.string().min(1) }).parse(req.body);
    const result = await importFromPgnText(body.pgn);
    return result;
  });

  app.post("/games/import/chesscom", async (req, reply) => {
    const body = importChessComSchema.parse(req.body);
    const games = await importChessCom(body);
    console.log(games)
    return importGames(games, GameSource.CHESS_COM);
  });

  app.post("/games/import/lichess", async (req, reply) => {
    const { username, maxGames } = importChessComSchema.parse(req.body);
    const games = await importLichess(username, maxGames);
    return importGames(games, GameSource.LICHESS);
  });
}