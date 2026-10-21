import { Component, computed, signal, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Chess } from 'chess.js';
import { ApiService } from '../../app/services/api.service';
import { ChessBoardComponent, type AnnotationChange, type ColoredArrow, type ColoredCircle } from '../chessboard/chess-board.component';
import type { Annotation, AnnotationType, Chapter, Study } from '../../app/models';

export function sanTokens(moveText: string): string[] {
  let t = moveText.replace(/\{[^}]*\}/g, ' ');
  let prev = '';
  while (prev !== t) {
    prev = t;
    t = t.replace(/\([^()]*\)/g, ' ');
  }
  t = t.replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, '');
  t = t.replace(/\$\d+/g, ' ');
  return t.split(/\s+/).filter((x) => x.length > 0 && !/^\d+\.{1,3}$/.test(x));
}

export function buildFens(fen: string | null | undefined, moveText: string | null | undefined): string[] {
  const chess = fen && fen !== 'start' ? new Chess(fen) : new Chess();
  const fens = [chess.fen()];
  for (const san of sanTokens(moveText ?? '')) {
    try {
      chess.move(san);
      fens.push(chess.fen());
    } catch {
      fens.push(fens[fens.length - 1]);
    }
  }
  return fens;
}

@Component({
  selector: 'app-study-viewer',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent],
  templateUrl: './study-viewer.component.html',
  styleUrl: './study-viewer.component.css',
})
export class StudyViewerComponent {
  study = signal<Study | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  selectedChapterId = signal<string | null>(null);
  currentPly = signal(0);

  // Anotações do capítulo selecionado (todas as plies)
  annotations = signal<Annotation[]>([]);

  // Moves/FENs do capítulo selecionado (recalculado ao trocar de capítulo)
  sanList: string[] = [];
  fens: string[] = ['start'];

  // Formulário de novo capítulo
  showingChapterForm = signal(false);
  chapterName = signal('');
  chapterFen = signal('start');
  chapterPgn = signal('');
  boardOrientation = signal<'white' | 'black'>('white');

  // Formulário de anotação textual
  textValue = signal('');

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

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

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadStudy(id);
  }

  async loadStudy(id: string) {
    this.loading.set(true);
    this.error.set(null);
    try {
      const study = await this.api.getStudy(id);
      this.study.set(study);
      if (study.chapters?.length && !this.selectedChapterId()) {
        this.selectedChapterId.set(study.chapters[0].id);
      }
      this.setupChapter();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  get selectedChapter(): Chapter | null {
    const chapters = this.study()?.chapters ?? [];
    return chapters.find((c) => c.id === this.selectedChapterId()) ?? chapters[0] ?? null;
  }

  /** Reconstrói moves/fens e anotações a partir do capítulo selecionado. */
  private setupChapter() {
    const chapter = this.selectedChapter;
    if (!chapter) {
      this.sanList = [];
      this.fens = ['start'];
      this.annotations.set([]);
      this.currentPly.set(0);
      return;
    }
    this.sanList = sanTokens(chapter.pgn ?? '');
    this.fens = buildFens(chapter.fen, chapter.pgn);
    this.annotations.set(chapter.annotations ?? []);
    this.currentPly.set(0);
  }

  selectChapter(id: string) {
    this.selectedChapterId.set(id);
    this.setupChapter();
  }

  // ---- derivados reativos ----
  get currentFen(): string {
    return this.fens[this.currentPly()] ?? 'start';
  }

  get totalPly(): number {
    return this.fens.length - 1;
  }

  currentAnnotations = computed(() =>
    this.annotations().filter((a) => a.ply === this.currentPly()),
  );

  currentArrows = computed<ColoredArrow[]>(() =>
    this.currentAnnotations()
      .filter((a) => a.type === 'ARROW' && a.from && a.to)
      .map((a) => ({ from: a.from!, to: a.to!, color: a.color ?? 'green' })),
  );

  currentCircles = computed<ColoredCircle[]>(() =>
    this.currentAnnotations()
      .filter((a) => a.type === 'CIRCLE' && a.square)
      .map((a) => ({ square: a.square!, color: a.color ?? 'green' })),
  );

  currentTexts = computed<Annotation[]>(() =>
    this.currentAnnotations().filter((a) => a.type === 'TEXT'),
  );

  moveRows = computed(() => {
    const rows: { number: number; white?: string; black?: string }[] = [];
    for (let i = 0; i < this.sanList.length; i += 2) {
      rows.push({
        number: i / 2 + 1,
        white: this.sanList[i],
        black: this.sanList[i + 1],
      });
    }
    return rows;
  });

  plyFor(row: { number: number }, color: 'white' | 'black'): number {
    return color === 'white' ? row.number * 2 - 1 : row.number * 2;
  }

  isActive(row: { number: number }, color: 'white' | 'black'): boolean {
    return this.currentPly() === this.plyFor(row, color);
  }

  goTo(ply: number) {
    this.currentPly.set(Math.max(0, Math.min(ply, this.totalPly)));
  }
  first() {
    this.goTo(0);
  }
  prev() {
    this.goTo(this.currentPly() - 1);
  }
  next() {
    this.goTo(this.currentPly() + 1);
  }
  last() {
    this.goTo(this.totalPly);
  }

  flip() {
    this.boardOrientation.set(this.boardOrientation() === 'white' ? 'black' : 'white');
  }

  backToList() {
    this.router.navigate(['/studies']);
  }

  // ---- Capítulo ----
  onChapterNameInput(event: Event) {
    this.chapterName.set((event.target as HTMLInputElement).value);
  }
  onChapterFenInput(event: Event) {
    this.chapterFen.set((event.target as HTMLInputElement).value);
  }
  onChapterPgnInput(event: Event) {
    this.chapterPgn.set((event.target as HTMLInputElement).value);
  }

  async addChapter() {
    const study = this.study();
    const name = this.chapterName().trim();
    if (!study || !name) return;
    this.error.set(null);
    try {
      const chapter = await this.api.createChapter(study.id, {
        name,
        fen: this.chapterFen().trim() || 'start',
        pgn: this.chapterPgn().trim() || undefined,
      });
      this.chapterName.set('');
      this.chapterFen.set('start');
      this.chapterPgn.set('');
      this.showingChapterForm.set(false);
      await this.loadStudy(study.id);
      this.selectedChapterId.set(chapter.id);
      this.setupChapter();
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  async deleteChapter(chapter: Chapter) {
    if (!window.confirm(`Excluir o capítulo "${chapter.name}"?`)) return;
    try {
      await this.api.deleteChapter(chapter.id);
      if (this.selectedChapterId() === chapter.id) {
        this.selectedChapterId.set(null);
      }
      await this.loadStudy(this.study()!.id);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  // ---- Anotações por clique direito (seta/círculo) ----
  async onAnnotationAdded(change: AnnotationChange) {
    const chapter = this.selectedChapter;
    if (!chapter) return;
    try {
      const ann = await this.api.addAnnotation(chapter.id, {
        type: change.type,
        ply: this.currentPly(),
        from: change.from,
        to: change.to,
        square: change.square,
        color: change.color,
      });
      this.annotations.set([...this.annotations(), ann]);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  async onAnnotationRemoved(change: AnnotationChange) {
    const ann = this.annotations().find((a) =>
      a.ply === this.currentPly() &&
      a.type === change.type &&
      (change.type === 'ARROW'
        ? a.from === change.from && a.to === change.to && (a.color ?? 'green') === change.color
        : a.square === change.square && (a.color ?? 'green') === change.color),
    );
    if (!ann) return;
    try {
      await this.api.deleteAnnotation(ann.id);
      this.annotations.set(this.annotations().filter((a) => a.id !== ann.id));
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  // ---- Anotação textual ----
  onTextInput(event: Event) {
    this.textValue.set((event.target as HTMLInputElement).value);
  }

  async addText() {
    const chapter = this.selectedChapter;
    const text = this.textValue().trim();
    if (!chapter || !text) return;
    try {
      const ann = await this.api.addAnnotation(chapter.id, {
        type: 'TEXT',
        ply: this.currentPly(),
        text,
      });
      this.annotations.set([...this.annotations(), ann]);
      this.textValue.set('');
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  async deleteText(annotation: Annotation) {
    try {
      await this.api.deleteAnnotation(annotation.id);
      this.annotations.set(this.annotations().filter((a) => a.id !== annotation.id));
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  typeLabel(type: AnnotationType): string {
    switch (type) {
      case 'ARROW':
        return 'Seta';
      case 'CIRCLE':
        return 'Círculo';
      case 'TEXT':
        return 'Texto';
      default:
        return type;
    }
  }
}