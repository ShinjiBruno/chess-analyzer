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



interface ChessComGame {
  url?: string;
  pgn?: string;
  white?: {result: string, username: string};
  black?: {result: string, username: string};
  time_class?:string
}

function filterChesscomGames(
  games: ChessComGame[], 
  username: string,
  isWin?: boolean | null, 
  color?: 'WHITE' | 'BLACK' | null, 
  timeControl?: 'BLITZ' | 'RAPID' | 'BULLET'| 'CLASSICAL' | 'CORRESPONDENCE' | 'CUSTOM' | null): ChessComGame[] {
    return games.filter((g)=>{
      //filtrar por vencedor
      if(!isWin) {return true}
      const winner = g.white?.result === "win" ? g.white?.username : g.black?.username;
      return isWin && winner?.toLowerCase() === username.toLowerCase();

    }).filter((g)=>{
      //filtrar por cor
      if(!color){return true}
      const playerColor = g.white?.username.toLowerCase() === username.toLowerCase() ? 'white' : 'black';
      return color.toLowerCase() === playerColor;
    }).filter((g)=>{
      //filtrar por modalidade
      if(!timeControl){return true}
      const tc = g.time_class?.toLowerCase();
      return tc === timeControl.toLowerCase();
    })
}

/** Importa as ultimas partidas de um usuario do chess.com (api publica). **/
export async function importChessCom( body: { username: string; maxGames: number; isWin?: boolean | null; color?: 'WHITE' | 'BLACK' | null; timeControl?: 'BLITZ' | 'RAPID' | 'BULLET'| 'CLASSICAL' | 'CORRESPONDENCE' | 'CUSTOM' | null }): Promise<ImportedGame[]> {
  
  const { username, maxGames, isWin, color, timeControl } = body;
  
  if(maxGames <= 0) return []

  const archives = await chessComArchives(username);
  const selected = archives.reverse() 

  let gameCount = 0;
  const games: ImportedGame[] = [];

  for (const arch of selected) {
    const text = await fetchText(arch).catch((e) => {if(e.message.includes("404 Not Found")) return "Not Found"; else throw e;});
    if(text === "Not Found") continue;
    const json = JSON.parse(text) as { games?: ChessComGame[] }; 
    const filteredGames = filterChesscomGames(json.games ?? [], username, isWin, color, timeControl);
    for (const g of filteredGames) {
      if (!g.pgn) continue;
      gameCount++;
      const pgn = parsePgn(g.pgn);
      games.push({
        pgn,
        url: g.url,
        externalId: g.url ?? pgn.site,
      });
      if (gameCount >= maxGames) return games;
    }
  }
  return games;
}

/** Importa as últimas partidas de um usuário do lichess.org. */
export async function importLichess(
  username: string,
  maxGames = 20,
  isWin?: boolean | null,
  color?: 'WHITE' | 'BLACK' | null,
  timeControl?: 'BLITZ' | 'RAPID' | 'BULLET'| 'CLASSICAL' | 'CORRESPONDENCE' | 'CUSTOM' | null
): Promise<ImportedGame[]> {
  const url = `${LICHESS_API}/api/games/user/${encodeURIComponent(username)}?max=${maxGames}&pgnInJson=false`;
  const pgnText = await fetchText(url);
  const parsed = parseMultiplePgn(pgnText);
  return parsed.map((pgn) => ({ pgn, externalId: pgn.site, url: pgn.site }));
}