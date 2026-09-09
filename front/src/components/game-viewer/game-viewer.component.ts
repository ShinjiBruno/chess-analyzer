import { Component, HostListener, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Chess } from 'chess.js';
import { ApiService } from '../../app/services/api.service';
import { ChessBoardComponent } from '../chessboard/chess-board.component';
import type { Game, Study } from '../../app/models';

interface MoveRow {
  number: number;
  white: string;
  black: string | null;
}

@Component({
  selector: 'app-game-viewer',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent],
  templateUrl: './game-viewer.component.html',
  styleUrl: './game-viewer.component.css',
})
export class GameViewerComponent {
  game = signal<Game | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  currentIndex = signal(0);
  fens: string[] = [];
  chess = new Chess();

  boardOrientation: 'white' | 'black' = 'white';

  // Formulário "salvar como estudo/capítulo"
  showSaveForm = signal(false);
  saveMode = signal<'new' | 'existing'>('new');
  newStudyName = signal('');
  chapterName = signal('');
  studies = signal<Study[]>([]);
  selectedStudyId = signal<string | null>(null);

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadGame(id);
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.first();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.last();
    }
  }

  async loadGame(id: string) {
    this.loading.set(true);
    this.error.set(null);
    try {
      const game = await this.api.getGame(id);
      this.game.set(game);
      this.buildFens(game);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  buildFens(game: Game) {
    const moves = game.moves ?? [];
    const chess = new Chess();
    this.fens = [chess.fen()];
    for (const move of moves) {
      try {
        chess.move(move.san);
        this.fens.push(chess.fen());
      } catch {
        this.fens.push(this.fens[this.fens.length - 1]);
      }
    }
    this.currentIndex.set(0);
  }

  get moveRows(): MoveRow[] {
    const moves = this.game()?.moves ?? [];
    const rows: MoveRow[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      rows.push({ number: i / 2 + 1, white: moves[i].san, black: moves[i + 1]?.san ?? null });
    }
    return rows;
  }

  plyFor(row: MoveRow, color: 'white' | 'black'): number {
    return color === 'white' ? row.number * 2 - 1 : row.number * 2;
  }

  isActive(row: MoveRow, color: 'white' | 'black'): boolean {
    return this.currentIndex() === this.plyFor(row, color);
  }

  get currentFen(): string {
    return this.fens[this.currentIndex()] ?? new Chess().fen();
  }

  get totalPly(): number {
    return this.fens.length - 1;
  }

  /** Lances restantes (SAN) a partir da posição atual. */
  get remainingSan(): string {
    const moves = this.game()?.moves ?? [];
    return moves
      .slice(this.currentIndex())
      .map((m) => m.san)
      .join(' ');
  }

  goTo(index: number) {
    this.currentIndex.set(Math.max(0, Math.min(index, this.totalPly)));
  }

  first() {
    this.goTo(0);
  }
  prev() {
    this.goTo(this.currentIndex() - 1);
  }
  next() {
    this.goTo(this.currentIndex() + 1);
  }
  last() {
    this.goTo(this.totalPly);
  }

  flip() {
    this.boardOrientation = this.boardOrientation === 'white' ? 'black' : 'white';
  }

  backToList() {
    this.router.navigate(['/']);
  }

  async deleteGame() {
    const game = this.game();
    if (!game) return;
    const confirmed = window.confirm(
      `Excluir a partida ${game.white} vs ${game.black}? Essa ação não pode ser desfeita.`,
    );
    if (!confirmed) return;
    try {
      await this.api.deleteGame(game.id);
      this.router.navigate(['/']);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  // ---- Salvar como estudo/capítulo -------------------------------------------------
  async openSaveForm() {
    this.saveMode.set('new');
    this.newStudyName.set('');
    this.chapterName.set('');
    this.selectedStudyId.set(null);
    try {
      this.studies.set(await this.api.listStudies());
    } catch {
      this.studies.set([]);
    }
    this.showSaveForm.set(true);
  }

  onNewStudyNameInput(event: Event) {
    this.newStudyName.set((event.target as HTMLInputElement).value);
  }
  onChapterNameInput(event: Event) {
    this.chapterName.set((event.target as HTMLInputElement).value);
  }
  onStudySelect(event: Event) {
    this.selectedStudyId.set((event.target as HTMLSelectElement).value || null);
  }

  async saveAsChapter() {
    const chapterName = this.chapterName().trim();
    if (!chapterName) {
      this.error.set('Informe o nome do capítulo.');
      return;
    }
    const fen = this.currentFen;
    const pgn = this.remainingSan;

    this.error.set(null);
    try {
      let studyId: string;
      if (this.saveMode() === 'new') {
        const studyName = this.newStudyName().trim();
        if (!studyName) {
          this.error.set('Informe o nome do novo estudo.');
          return;
        }
        const study = await this.api.createStudy({ name: studyName });
        studyId = study.id;
      } else {
        if (!this.selectedStudyId()) {
          this.error.set('Selecione um estudo existente.');
          return;
        }
        studyId = this.selectedStudyId()!;
      }
      await this.api.createChapter(studyId, { name: chapterName, fen, pgn: pgn || undefined });
      this.showSaveForm.set(false);
      this.router.navigate(['/study', studyId]);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  resultLabel(result: Game['result']): string {
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

  resultClass(result: Game['result']): string {
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

  timeControlLabel(tc: Game['timeControl']): string {
    const map: Record<string, string> = {
      BULLET: 'Bullet',
      BLITZ: 'Blitz',
      RAPID: 'Rapid',
      CLASSICAL: 'Classical',
      CORRESPONDENCE: 'Correspondência',
      CUSTOM: 'Personalizado',
    };
    return map[tc] ?? tc;
  }
}