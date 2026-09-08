import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Chess } from 'chess.js';
import { ApiService } from '../../app/services/api.service';
import { ChessBoardComponent } from '../chessboard/chess-board.component';
import type { Game } from '../../app/models';

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

  // Estado de navegação
  currentIndex = signal(0); // meios-lances percorridos
  fens: string[] = [];
  chess = new Chess();

  boardOrientation: 'white' | 'black' = 'white';

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadGame(id);
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
        // lance ilegal/ambíguo, repete estado anterior
        this.fens.push(this.fens[this.fens.length - 1]);
      }
    }
    this.currentIndex.set(0);
  }

  get currentFen(): string {
    return this.fens[this.currentIndex()] ?? new Chess().fen();
  }

  get totalPly(): number {
    return this.fens.length - 1;
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