import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../app/services/api.service';
import type {
  GameStats,
  OutcomeCounts,
  TimeControl,
} from '../../app/models';

type PeriodPreset = 'all' | '7d' | '30d' | '90d' | '365d' | 'custom';

const PERIOD_DAYS: Partial<Record<PeriodPreset, number>> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '365d': 365,
};

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css',
})
export class StatsComponent {
  stats = signal<GameStats | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  username = signal('');
  period = signal<PeriodPreset>('all');
  fromDate = signal('');
  untilDate = signal('');

  readonly timeControlLabels: { value: TimeControl; label: string }[] = [
    { value: 'BULLET', label: 'Bullet' },
    { value: 'BLITZ', label: 'Blitz' },
    { value: 'RAPID', label: 'Rapid' },
    { value: 'CLASSICAL', label: 'Clássico' },
    { value: 'CORRESPONDENCE', label: 'Correspondência' },
    { value: 'CUSTOM', label: 'Personalizado' },
  ];

  constructor(
    private api: ApiService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadStats();
  }

  onUsernameInput(event: Event) {
    this.username.set((event.target as HTMLInputElement).value);
  }

  onPeriodChange(event: Event) {
    this.period.set((event.target as HTMLSelectElement).value as PeriodPreset);
  }

  onFromInput(event: Event) {
    this.fromDate.set((event.target as HTMLInputElement).value);
  }

  onUntilInput(event: Event) {
    this.untilDate.set((event.target as HTMLInputElement).value);
  }

  apply() {
    this.loadStats();
  }

  private playedSince(): string | undefined {
    if (this.period() === 'custom') {
      return this.fromDate() ? new Date(this.fromDate()).toISOString() : undefined;
    }
    const days = PERIOD_DAYS[this.period()];
    if (!days) return undefined;
    const since = new Date();
    since.setDate(since.getDate() - days);
    return since.toISOString();
  }

  private playedUntil(): string | undefined {
    if (this.period() === 'custom') {
      return this.untilDate() ? new Date(this.untilDate()).toISOString() : undefined;
    }
    return undefined;
  }

  async loadStats() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const username = this.username().trim();
      const since = this.playedSince();
      const until = this.playedUntil();
      this.stats.set(
        await this.api.getStats({
          ...(username ? { username } : {}),
          ...(since ? { playedSince: since } : {}),
          ...(until ? { playedUntil: until } : {}),
        }),
      );
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  goToImport() {
    this.router.navigate(['/']);
  }

  timeControlLabel(tc: TimeControl): string {
    return this.timeControlLabels.find((t) => t.value === tc)?.label ?? tc;
  }

  /** Percentual de vitórias sobre jogos com resultado definido. */
  winRate(row: OutcomeCounts): number {
    const decided = row.wins + row.losses + row.draws;
    return decided ? Math.round((row.wins / decided) * 100) : 0;
  }

  /** Segmentos (0-100) para a barra empilhada W/D/L/N. */
  segments(row: OutcomeCounts): { win: number; draw: number; loss: number; unknown: number } {
    const total = row.total || 1;
    const seg = (n: number) => Math.max(0, Math.round((n / total) * 100));
    return {
      win: seg(row.wins),
      draw: seg(row.draws),
      loss: seg(row.losses),
      unknown: seg(row.unknown),
    };
  }
}