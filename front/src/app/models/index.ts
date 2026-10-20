export type Color = 'WHITE' | 'BLACK';
export type GameResult = 'WHITE_WIN' | 'BLACK_WIN' | 'DRAW' | 'UNKNOWN';
export type TimeControl = 'BULLET' | 'BLITZ' | 'RAPID' | 'CLASSICAL' | 'CORRESPONDENCE' | 'CUSTOM';
export type GameSource = 'MANUAL' | 'CHESS_COM' | 'LICHESS' | 'PGN_FILE';
export type AnnotationType = 'ARROW' | 'CIRCLE' | 'HIGHLIGHT' | 'TEXT';

export interface Move {
  id: string;
  gameId: string;
  ply: number;
  san: string;
  uci?: string | null;
  before?: string | null;
  after?: string | null;
  comment?: string | null;
  timeSpentSec?: number | null;
  eval?: number | null;
}

export interface Game {
  id: string;
  externalId?: string | null;
  source: GameSource;
  url?: string | null;
  white: string;
  black: string;
  whiteElo?: number | null;
  blackElo?: number | null;
  result: GameResult;
  resultBy?: string | null;
  termination?: string | null;
  timeControl: TimeControl;
  opening?: string | null;
  eco?: string | null;
  fen: string;
  turns: number;
  playedAt?: string | null;
  pgn?: string | null;
  isWhiteWin: boolean;
  isBlackWin: boolean;
  isDraw: boolean;
  createdAt: string;
  updatedAt: string;
  moves?: Move[];
  _count?: { moves?: number };
}

export interface GameListResponse {
  total: number;
  page: number;
  pageSize: number;
  games: Game[];
}

export interface OutcomeCounts {
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
  playedSince: string | null;
  playedUntil: string | null;
  total: number;
  wins: number;
  losses: number;
  draws: number;
  unknown: number;
  byTimeControl: TimeControlStats[];
  byOpening: OpeningStats[];
}

export interface StatsFilter {
  username?: string;
  playedSince?: string;
  playedUntil?: string;
}

export interface Annotation {
  id: string;
  chapterId: string;
  type: AnnotationType;
  ply: number;
  square?: string | null;
  from?: string | null;
  to?: string | null;
  text?: string | null;
  color?: string | null;
  createdAt: string;
}

export interface Chapter {
  id: string;
  studyId: string;
  name: string;
  fen: string;
  pgn?: string | null;
  annotations: Annotation[];
  createdAt: string;
  updatedAt: string;
}

export interface Study {
  id: string;
  name: string;
  description?: string | null;
  gameId?: string | null;
  tags: string;
  createdAt: string;
  updatedAt: string;
  chapters?: Chapter[];
  game?: Game | null;
  _count?: { chapters?: number };
}

export interface GameFilter {
  opening?: string;
  eco?: string;
  timeControl?: TimeControl;
  result?: GameResult;
  color?: Color;
  source?: GameSource;
  white?: string;
  black?: string;
  query?: string;
  playedSince?: string;
  playedUntil?: string;
  page?: number;
  pageSize?: number;
}