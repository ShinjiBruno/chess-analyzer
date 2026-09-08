import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessBoardComponent } from '../chessboard/chess-board.component';
import { Chess } from 'chess.js';

@Component({
  selector: 'app-game-analysis',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent],
  templateUrl: `./game-analysis.component.html`,
  styleUrl: `./game-analysis.component.css`
})
export class GameAnalysisComponent {
  // Instancia a engine de regras do xadrez
  chess = new Chess();
  
  currentFen: string = this.chess.fen();
  boardOrientation: 'white' | 'black' = 'white';

  // ATENÇÃO: Usar Arrow Function aqui preserva o escopo do "this" ao ser chamado dentro do filho
  validateMove = (from: string, to: string): boolean => {
    try {
      // promocao padrao eh rainha ('q')
      const move = this.chess.move({ from, to, promotion: 'q' });
      return !!move; // Retorna true se for um lance legal nas regras do xadrez
    } catch (error) {
      return false; // Retorna false se violar qualquer regra (peça pulando outra, rei em xeque, etc)
    }
  };

  handleMoveMade(event: { from: string; to: string }) {
    // Sincroniza o estado do FEN atual para disparar atualizações e reatividades na tela
    this.currentFen = this.chess.fen();
    console.log('Lance validado no Chess.js e atualizado no app:', event);
  }

  flipBoard() {
    this.boardOrientation = this.boardOrientation === 'white' ? 'black' : 'white';
  }

  resetGame() {
    this.chess.reset();
    this.currentFen = this.chess.fen();
  }
}