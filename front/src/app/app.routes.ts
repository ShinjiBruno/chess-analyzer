import { Routes } from '@angular/router';
import { DashboardComponent } from '../components/dashboard/dashboard.component';
import { GameViewerComponent } from '../components/game-viewer/game-viewer.component';
import { StudiesComponent } from '../components/studies/studies.component';
import { StudyViewerComponent } from '../components/study-viewer/study-viewer.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'game/:id', component: GameViewerComponent },
  { path: 'studies', component: StudiesComponent },
  { path: 'study/:id', component: StudyViewerComponent },
  { path: '**', redirectTo: '' },
];