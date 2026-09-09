import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../app/services/api.service';
import type { Study } from '../../app/models';

@Component({
  selector: 'app-studies',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './studies.component.html',
  styleUrl: './studies.component.css',
})
export class StudiesComponent {
  studies = signal<Study[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Formulário de criação
  creating = signal(false);
  newName = signal('');
  newDescription = signal('');
  newTags = signal('');

  constructor(
    private api: ApiService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadStudies();
  }

  async loadStudies() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.studies.set(await this.api.listStudies());
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  onNameInput(event: Event) {
    this.newName.set((event.target as HTMLInputElement).value);
  }
  onDescriptionInput(event: Event) {
    this.newDescription.set((event.target as HTMLInputElement).value);
  }
  onTagsInput(event: Event) {
    this.newTags.set((event.target as HTMLInputElement).value);
  }

  async createStudy() {
    const name = this.newName().trim();
    if (!name) return;
    const tags = this.newTags()
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    this.error.set(null);
    try {
      await this.api.createStudy({
        name,
        description: this.newDescription().trim() || undefined,
        tags,
      });
      this.newName.set('');
      this.newDescription.set('');
      this.newTags.set('');
      this.creating.set(false);
      this.loadStudies();
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  async deleteStudy(study: Study) {
    const confirmed = window.confirm(`Excluir o estudo "${study.name}"?`);
    if (!confirmed) return;
    try {
      await this.api.deleteStudy(study.id);
      this.loadStudies();
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  openStudy(study: Study) {
    this.router.navigate(['/study', study.id]);
  }

  parseTags(tags: string): string[] {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}