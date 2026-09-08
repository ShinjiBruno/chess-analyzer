import { Routes } from '@angular/router';
import { DashboardComponent } from '../components/dashboard/dashboard.component';
import { GameViewerComponent } from '../components/game-viewer/game-viewer.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'game/:id', component: GameViewerComponent },
  { path: '**', redirectTo: '' },
];