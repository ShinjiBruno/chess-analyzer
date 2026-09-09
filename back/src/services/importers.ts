import { parseMultiplePgn, parsePgn, type ParsedPgnGame } from "./pgn-parser.js";

const CHESS_COM_API = process.env.CHESS_COM_API ?? "https://api.chess.com";
const LICHESS_API = process.env.LICHESS_API ?? "https://lichess.org";

export type ImportOrigin = "chesscom" | "lichess";

export interface ImportedGame {
  pgn: ParsedPgnGame;
  externalId?: string;
  url?: string;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "chess-analyzer/1.0 (personal project)" },
  });
  if (!res.ok) {
    throw new Error(`Falha ao buscar ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

/** Obtém os arquivos (months) de jogos disponíveis para um usuário do chess.com. */
async function chessComArchives(username: string): Promise<string[]> {
  const url = `${CHESS_COM_API}/pub/player/${encodeURIComponent(username)}/games/archives`;
  const data = await fetchText(url);
  const json = JSON.parse(data) as { archives?: string[] };
  return json.archives ?? [];
}

/** Filtra os arquivos a serem baixados conforme o número de partidas solicitado. */
function selectArchives(archives: string[], maxGames: number): string[] {
  // do mais recente para o mais antigo
  const reversed = [...archives].reverse();
  const selected: string[] = [];
  let acc = 0;
  for (const arch of reversed) {
    selected.push(arch);
    acc += 100; // cada arquivo mensal tem até ~100 partidas
    if (acc >= maxGames) break;
  }
  return selected;
}

interface ChessComGame {
  url?: string;
  pgn?: string;
}

/** Importa as últimas partidas de um usuário do chess.com (sem autenticação). */
export async function importChessCom(
  username: string,
  maxGames = 20,
): Promise<ImportedGame[]> {
  const archives = await chessComArchives(username);
  const selected = selectArchives(archives, maxGames);

  const games: ImportedGame[] = [];
  for (const arch of selected) {
    const text = await fetchText(arch);
    const json = JSON.parse(text) as { games?: ChessComGame[] };
    for (const g of json.games ?? []) {
      if (!g.pgn) continue;
      const pgn = parsePgn(g.pgn);
      games.push({
        pgn,
        url: g.url,
        externalId: g.url ?? pgn.site,
      });
      if (games.length >= maxGames) return games;
    }
  }
  return games;
}

/** Importa as últimas partidas de um usuário do lichess.org. */
export async function importLichess(
  username: string,
  maxGames = 20,
): Promise<ImportedGame[]> {
  const url = `${LICHESS_API}/api/games/user/${encodeURIComponent(username)}?max=${maxGames}&pgnInJson=false`;
  const pgnText = await fetchText(url);
  const parsed = parseMultiplePgn(pgnText);
  return parsed.map((pgn) => ({ pgn, externalId: pgn.site, url: pgn.site }));
}