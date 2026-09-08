import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GameAnalysisComponent } from '../components/game-analysis/game-analysis.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GameAnalysisComponent ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('chess-aps');
  
}
