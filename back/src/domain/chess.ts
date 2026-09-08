import { Color, GameResult, TimeControl } from "@prisma/client";

/** Converte um resultado textual de PGN ("1-0", "0-1", "1/2-1/2", "*") para o enum. */
export function parseResult(result: string | null | undefined): GameResult {
  if (!result) return GameResult.UNKNOWN;
  const r = result.trim();
  if (r === "1-0") return GameResult.WHITE_WIN;
  if (r === "0-1") return GameResult.BLACK_WIN;
  if (r === "1/2-1/2") return GameResult.DRAW;
  return GameResult.UNKNOWN;
}

/** Mapeia o time control ("bullet", "blitz", ...) para o enum de TimeControl. */
export function parseTimeControl(value: string | null | undefined): TimeControl {
  const v = (value ?? "").toLowerCase();
  if (v.includes("bullet")) return TimeControl.BULLET;
  if (v.includes("blitz")) return TimeControl.BLITZ;
  if (v.includes("rapid")) return TimeControl.RAPID;
  if (v.includes("classical")) return TimeControl.CLASSICAL;
  if (v.includes("correspondence") || v.includes("daily")) return TimeControl.CORRESPONDENCE;

  // Fallback: inferir pelos segundos iniciais no formato "300" ou "300+2"
  const secs = parseInt(v, 10);
  if (!Number.isNaN(secs)) {
    if (secs < 180) return TimeControl.BULLET;
    if (secs < 600) return TimeControl.BLITZ;
    if (secs < 1800) return TimeControl.RAPID;
    return TimeControl.CLASSICAL;
  }

  return TimeControl.CUSTOM;
}

/** Determina a cor associada a um resultado, útil para filtros de "vitórias com brancas/pretas". */
export function winnerOf(result: GameResult): Color | null {
  if (result === GameResult.WHITE_WIN) return Color.WHITE;
  if (result === GameResult.BLACK_WIN) return Color.BLACK;
  return null;
}