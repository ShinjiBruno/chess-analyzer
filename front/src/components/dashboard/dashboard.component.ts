import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../app/services/api.service';
import { ImportDialogComponent } from '../import-dialog/import-dialog.component';
import type { Game, GameFilter, GameResult, GameSource, TimeControl } from '../../app/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ImportDialogComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  games = signal<Game[]>([]);
  total = signal(0);
  loading = signal(false);
  error = signal<string | null>(null);
  importOpen = signal(false);

  filter = signal<GameFilter>({ page: 1, pageSize: 50 });

  readonly timeControlLabels: { value: TimeControl; label: string }[] = [
    { value: 'BULLET', label: 'Bullet' },
    { value: 'BLITZ', label: 'Blitz' },
    { value: 'RAPID', label: 'Rapid' },
    { value: 'CLASSICAL', label: 'Classical' },
    { value: 'CORRESPONDENCE', label: 'Correspondência' },
    { value: 'CUSTOM', label: 'Personalizado' },
  ];

  readonly sourceLabels: { value: GameSource; label: string }[] = [
    { value: 'MANUAL', label: 'Manual' },
    { value: 'CHESS_COM', label: 'Chess.com' },
    { value: 'LICHESS', label: 'Lichess' },
    { value: 'PGN_FILE', label: 'Arquivo PGN' },
  ];

  constructor(
    private api: ApiService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadGames();
  }

  async loadGames() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.api.listGames(this.filter());
      this.games.set(res.games);
      this.total.set(res.total);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  applyFilter() {
    this.filter.update((f) => ({ ...f, page: 1 }));
    this.loadGames();
  }

  resetFilters() {
    this.filter.set({ page: 1, pageSize: 50 });
    this.loadGames();
  }

  openImport() {
    this.importOpen.set(true);
  }

  onImported() {
    this.importOpen.set(false);
    this.loadGames();
  }

  onQueryInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.filter.update((f) => ({ ...f, query: value || undefined }));
  }

  onFieldInput(field: 'opening' | 'eco', event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.filter.update((f) => ({ ...f, [field]: value || undefined }));
  }

  onFieldChange(field: 'timeControl' | 'result' | 'source', event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.filter.update((f) => ({ ...f, [field]: (value || undefined) as never }));
  }

  openGame(game: Game) {
    this.router.navigate(['/game', game.id]);
  }

  resultLabel(result: GameResult): string {
    switch (result) {
      case 'WHITE_WIN':
        return '1 — 0';
      case 'BLACK_WIN':
        return '0 — 1';
      case 'DRAW':
        return '½ — ½';
      default:
        return '—';
    }
  }

  resultClass(result: GameResult): string {
    switch (result) {
      case 'WHITE_WIN':
        return 'win-white';
      case 'BLACK_WIN':
        return 'win-black';
      case 'DRAW':
        return 'draw';
      default:
        return 'unknown';
    }
  }

  timeControlLabel(tc: TimeControl): string {
    return this.timeControlLabels.find((t) => t.value === tc)?.label ?? tc;
  }

  sourceLabel(source: GameSource): string {
    return this.sourceLabels.find((s) => s.value === source)?.label ?? source;
  }
}