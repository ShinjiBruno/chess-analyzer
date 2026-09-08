import { parseResult, parseTimeControl } from "../domain/chess.js";

export interface ParsedPgnGame {
  white: string;
  black: string;
  whiteElo?: number;
  blackElo?: number;
  result: string;
  resultBy?: string;
  termination?: string;
  timeControlRaw?: string;
  opening?: string;
  eco?: string;
  playedAt?: Date;
  moves: { san: string; uci?: string; comment?: string }[];
  pgn: string;
}

interface HeaderMap {
  [key: string]: string;
}

function parseHeaders(raw: string): { headers: HeaderMap; body: string } {
  const headers: HeaderMap = {};
  const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
  let match: RegExpExecArray | null;
  const consumed: number[] = [];
  while ((match = headerRegex.exec(raw)) !== null) {
    headers[match[1]] = match[2];
    consumed.push(match.index, match.index + match[0].length);
  }

  // Corpo é o texto que sobra depois dos headers
  const lastHeaderEnd = consumed.length ? Math.max(...consumed) : 0;
  const body = raw.slice(lastHeaderEnd);
  return { headers, body };
}

/** Remove comentários ({...}), variações (...) e NAGs ($1, $11...) do texto dos lances. */
function cleanMoveText(body: string): string {
  // remove comentários entre chaves
  let text = body.replace(/\{[^}]*\}/g, " ");
  // remove variações entre parênteses (de forma iterativa para aninhamento)
  let prev = "";
  while (prev !== text) {
    prev = text;
    text = text.replace(/\([^()]*\)/g, " ");
  }
  // remove NAGs e símbolos de avaliação
  text = text.replace(/\$\d+/g, " ");
  return text;
}

function parseMoves(body: string): { san: string; uci?: string; comment?: string }[] {
  const text = cleanMoveText(body);
  // remove o resultado final do texto
  const withoutResult = text.replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, "");

  const tokens = withoutResult
    .split(/\s+/)
    .filter((t) => t.length > 0 && !/^\d+\.{1,3}$/.test(t)); // remove números de lance

  const moves: { san: string; uci?: string; comment?: string }[] = [];
  for (const token of tokens) {
    moves.push({ san: token });
  }
  return moves;
}

function parseHeaderInt(headers: HeaderMap, key: string): number | undefined {
  const raw = headers[key];
  if (!raw || raw === "?") return undefined;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? undefined : n;
}

/** Converte data de PGN (yyyy.mm.dd) para Date. */
function parsePgnDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const m = value.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return undefined;
  const date = new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
  );
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function parsePgn(pgn: string): ParsedPgnGame {
  const { headers, body } = parseHeaders(pgn);
  const timeControlRaw = headers["TimeControl"];
  const moves = parseMoves(body);

  return {
    white: headers["White"] ?? "Desconhecido",
    black: headers["Black"] ?? "Desconhecido",
    whiteElo: parseHeaderInt(headers, "WhiteElo"),
    blackElo: parseHeaderInt(headers, "BlackElo"),
    result: headers["Result"] ?? "*",
    resultBy: headers["Termination"],
    termination: headers["Termination"],
    timeControlRaw,
    opening: headers["Opening"] ?? headers["ECOUrl"],
    eco: headers["ECO"],
    playedAt: parsePgnDate(headers["Date"] ?? headers["UTCDate"] ?? headers["UTCDate"]),
    moves,
    pgn,
  };
}

/** Parsea um arquivo PGN que pode conter múltiplas partidas. */
export function parseMultiplePgn(pgn: string): ParsedPgnGame[] {
  // Divide pelo início de um novo header (linha começando com "[Event")
  const games: ParsedPgnGame[] = [];
  const parts = pgn.split(/\r?\n(?=\[Event\s)/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    games.push(parsePgn(trimmed));
  }
  return games;
}

export { parseTimeControl, parseResult };