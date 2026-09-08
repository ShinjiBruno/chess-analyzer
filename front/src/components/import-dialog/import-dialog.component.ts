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

  async doImport() {
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    try {
      let res: { imported: number };
      if (this.tab() === 'chesscom') {
        res = await this.api.importChessCom(this.username().trim(), this.maxGames());
      } else if (this.tab() === 'lichess') {
        res = await this.api.importLichess(this.username().trim(), this.maxGames());
      } else {
        res = await this.api.importPgn(this.pgnText());
      }
      this.result.set(`${res.imported} partida(s) importada(s) com sucesso.`);
      this.imported.emit();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}