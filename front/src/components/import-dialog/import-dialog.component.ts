import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../app/services/api.service';

@Component({
  selector: 'app-import-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-dialog.component.html',
  styleUrl: './import-dialog.component.css',
})
export class ImportDialogComponent {
  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() imported = new EventEmitter<void>();

  tab = signal<'chesscom' | 'lichess' | 'pgn'>('chesscom');
  username = signal('');
  maxGames = signal(20);
  //chess.com
  isWin = signal<boolean | null>(null);
  color = signal<'white' | 'black' | null>(null);
  timeControl = signal<'blitz' | 'rapid' | 'bullet'| 'classical' | null>(null);

  pgnText = signal('');

  loading = signal(false);
  error = signal<string | null>(null);
  result = signal<string | null>(null);

  constructor(private api: ApiService) {}

  onClose() {
    this.error.set(null);
    this.result.set(null);
    this.close.emit();
  }

  selectTab(tab: 'chesscom' | 'lichess' | 'pgn') {
    this.tab.set(tab);
    this.error.set(null);
    this.result.set(null);
  }

  onUsernameInput(event: Event) {
    this.username.set((event.target as HTMLInputElement).value);
  }

  onMaxGamesInput(event: Event) {
    const raw = (event.target as HTMLInputElement).value;
    const n = Number(raw);
    this.maxGames.set(Number.isFinite(n) && n > 0 ? n : 20);
  }

  onPgnInput(event: Event) {
    this.pgnText.set((event.target as HTMLTextAreaElement).value);
  }

  async doImport() {
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    try {
      let res: { imported: number; skipped: number };
      if (this.tab() === 'chesscom') {
        const filter = {username: this.username().trim(), maxGames: this.maxGames(), isWin: this.isWin(), color: this.color(), timeControl: this.timeControl()};
        res = await this.api.importChessCom(filter);
      } else if (this.tab() === 'lichess') {
        res = await this.api.importLichess(this.username().trim(), this.maxGames());
      } else {
        res = await this.api.importPgn(this.pgnText());
      }
      const parts = [`${res.imported} partida(s) importada(s)`];
      if (res.skipped > 0) parts.push(`${res.skipped} duplicada(s) ignorada(s)`);
      this.result.set(parts.join(' — ') + '.');
      this.imported.emit();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}