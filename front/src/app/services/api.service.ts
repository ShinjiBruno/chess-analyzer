import { Injectable } from '@angular/core';
import type {
  Annotation,
  Game,
  GameFilter,
  GameListResponse,
  GameStats,
  Study,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = 'http://localhost:3333';

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = body?.error ?? `Erro ${res.status}`;
      throw new Error(message);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  private buildQuery(params: Record<string, unknown>): string {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      qs.set(key, String(value));
    }
    const str = qs.toString();
    return str ? `?${str}` : '';
  }

  // ---- Games ----
  listGames(filter: GameFilter): Promise<GameListResponse> {
    return this.request<GameListResponse>(`/games${this.buildQuery(filter as Record<string, unknown>)}`);
  }

  getGame(id: string): Promise<Game> {
    return this.request<Game>(`/games/${id}`);
  }

  deleteGame(id: string): Promise<void> {
    return this.request<void>(`/games/${id}`, { method: 'DELETE' });
  }

  getStats(): Promise<GameStats> {
    return this.request<GameStats>('/games/stats');
  }

  importPgn(pgn: string): Promise<{ imported: number }> {
    return this.request<{ imported: number }>('/games/import/pgn', {
      method: 'POST',
      body: JSON.stringify({ pgn }),
    });
  }

  importChessCom(username: string, maxGames: number): Promise<{ imported: number }> {
    return this.request<{ imported: number }>('/games/import/chesscom', {
      method: 'POST',
      body: JSON.stringify({ username, maxGames }),
    });
  }

  importLichess(username: string, maxGames: number): Promise<{ imported: number }> {
    return this.request<{ imported: number }>('/games/import/lichess', {
      method: 'POST',
      body: JSON.stringify({ username, maxGames }),
    });
  }

  // ---- Studies ----
  listStudies(): Promise<Study[]> {
    return this.request<Study[]>('/studies');
  }

  getStudy(id: string): Promise<Study> {
    return this.request<Study>(`/studies/${id}`);
  }

  createStudy(data: { name: string; description?: string; gameId?: string; tags?: string[] }): Promise<Study> {
    return this.request<Study>('/studies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  deleteStudy(id: string): Promise<void> {
    return this.request<void>(`/studies/${id}`, { method: 'DELETE' });
  }

  createChapter(studyId: string, data: { name: string; fen: string; pgn?: string }): Promise<Study['chapters'] extends (infer C)[] ? C : never> {
    return this.request(`/studies/${studyId}/chapters`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  deleteChapter(id: string): Promise<void> {
    return this.request<void>(`/chapters/${id}`, { method: 'DELETE' });
  }

  addAnnotation(chapterId: string, data: Partial<Annotation>): Promise<Annotation> {
    return this.request<Annotation>(`/chapters/${chapterId}/annotations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  deleteAnnotation(id: string): Promise<void> {
    return this.request<void>(`/annotations/${id}`, { method: 'DELETE' });
  }
}