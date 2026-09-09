import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Chessboard, COLOR, INPUT_EVENT_TYPE } from 'cm-chessboard/src/Chessboard';
import { Markers, MARKER_TYPE } from 'cm-chessboard/src/extensions/markers/Markers.js';
import { Arrows } from 'cm-chessboard/src/extensions/arrows/Arrows.js';

export interface ColoredArrow {
  from: string;
  to: string;
  color: string;
}

export interface ColoredCircle {
  square: string;
  color: string;
}

export interface AnnotationChange {
  type: 'ARROW' | 'CIRCLE';
  color: string;
  from?: string;
  to?: string;
  square?: string;
}

// Cores suportadas pelo clique direito (setas e círculos).
const ARROW_TYPES: Record<string, { class: string }> = {
  green: { class: 'arrow-success' },
  red: { class: 'arrow-danger' },
  blue: { class: 'arrow-info' },
  orange: { class: 'arrow-warning' },
};

const CIRCLE_TYPES: Record<string, { class: string; slice: string }> = {
  green: { class: 'marker-circle-success', slice: 'markerCircle' },
  red: { class: 'marker-circle-danger', slice: 'markerCircle' },
  blue: { class: 'marker-circle-info', slice: 'markerCircle' },
  orange: { class: 'marker-circle-warning', slice: 'markerCircle' },
};

type ModifierColor = 'green' | 'red' | 'blue' | 'orange';

@Component({
  selector: 'app-chess-board',
  standalone: true,
  templateUrl: `./chess-board.component.html`,
  styleUrl: `./chess-board.component.css`,
})
export class ChessBoardComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('boardElement', { static: true }) boardElement!: ElementRef;

  @Input() fen: string = 'start';
  @Input() orientation: 'white' | 'black' = 'white';
  @Input() draggable: boolean = true;
  @Input() arrows: ColoredArrow[] = [];
  @Input() circles: ColoredCircle[] = [];

  @Input() onMoveValidate?: (from: string, to: string) => boolean;

  @Output() moveMade = new EventEmitter<{ from: string; to: string }>();
  @Output() annotationAdded = new EventEmitter<AnnotationChange>();
  @Output() annotationRemoved = new EventEmitter<AnnotationChange>();

  private board!: Chessboard;

  private currentArrows: ColoredArrow[] = [];
  private currentCircles: ColoredCircle[] = [];

  private dragStart: { square: string; color: ModifierColor } | undefined;

  ngOnInit() {
    this.initBoard();
    this.attachAnnotationListeners();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.board) return;

    if (changes['fen'] && !changes['fen'].firstChange) {
      this.board.setPosition(this.fen, true);
    }

    if (changes['orientation'] && !changes['orientation'].firstChange) {
      this.board.setOrientation(this.orientation === 'white' ? COLOR.white : COLOR.black);
    }

    if (changes['draggable']) {
      this.setupInputHandler();
    }

    if (changes['arrows'] || changes['circles']) {
      this.currentArrows = [...(this.arrows ?? [])];
      this.currentCircles = [...(this.circles ?? [])];
      this.renderAnnotations();
    }
  }

  private initBoard() {
    this.board = new Chessboard(this.boardElement.nativeElement, {
      position: this.fen,
      orientation: this.orientation === 'white' ? COLOR.white : COLOR.black,
      assetsUrl: '/assets/',
      style: {
        pieces: { file: 'pieces/standard.svg' },
      },
      extensions: [
        { class: Markers, props: { autoMarkers: MARKER_TYPE.frame } },
        { class: Arrows },
      ],
    });

    this.currentArrows = [...(this.arrows ?? [])];
    this.currentCircles = [...(this.circles ?? [])];
    this.setupInputHandler();
    this.renderAnnotations();
  }

  private setupInputHandler() {
    if (!this.draggable) {
      this.board.disableMoveInput();
      return;
    }

    this.board.enableMoveInput((event) => {
      if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
        return true;
      }

      if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
        if (!event.squareTo || event.squareFrom === event.squareTo) {
          return false;
        }

        if (this.onMoveValidate) {
          const isValid = this.onMoveValidate(event.squareFrom, event.squareTo);
          if (!isValid) {
            return false;
          }
          this.moveMade.emit({ from: event.squareFrom, to: event.squareTo });
          return true;
        }
        this.moveMade.emit({ from: event.squareFrom, to: event.squareTo });
        return true;
      }

      return true;
    });
  }

  // ------------------------------------------------------------------------
  // Anotações por clique direito
  // ------------------------------------------------------------------------
  private attachAnnotationListeners() {
    const el = this.boardElement.nativeElement as HTMLElement;
    this.onContextMenu = (e: MouseEvent) => e.preventDefault();
    this.onMouseDown = this.handleRightMouseDown.bind(this);
    this.onMouseUp = this.handleRightMouseUp.bind(this);

    el.addEventListener('contextmenu', this.onContextMenu);
    el.addEventListener('mousedown', this.onMouseDown);
    el.addEventListener('mouseup', this.onMouseUp);
    el.addEventListener('mouseleave', this.onMouseUp);
  }

  private onContextMenu?: (e: MouseEvent) => void;
  private onMouseDown?: (e: MouseEvent) => void;
  private onMouseUp?: (e: MouseEvent) => void;

  private handleRightMouseDown(e: MouseEvent) {
    if (e.button !== 2) return;
    const square = this.findSquare(e);
    if (!square) return;
    this.dragStart = { square, color: this.modifierColor(e) };
  }

  private handleRightMouseUp(e: MouseEvent) {
    if (!this.dragStart) return;
    if (e.button !== 2) {
      this.dragStart = undefined;
      return;
    }
    const start = this.dragStart;
    this.dragStart = undefined;
    const endSquare = this.findSquare(e);

    if (endSquare && start.square !== endSquare) {
      this.toggleArrow(start.square, endSquare, start.color);
    } else {
      this.toggleCircle(start.square, start.color);
    }
  }

  private modifierColor(e: MouseEvent): ModifierColor {
    const shift = e.shiftKey || e.ctrlKey;
    const alt = e.altKey;
    if (shift && alt) return 'orange';
    if (shift) return 'red';
    if (alt) return 'blue';
    return 'green';
  }

  private findSquare(e: MouseEvent): string | undefined {
    const target = e.target as HTMLElement | null;
    if (!target) return undefined;
    const el = target.closest?.('[data-square]');
    return el ? el.getAttribute('data-square') ?? undefined : undefined;
  }

  private toggleArrow(from: string, to: string, color: ModifierColor) {
    const exists = this.currentArrows.some(
      (a) => a.from === from && a.to === to && a.color === color,
    );
    if (exists) {
      this.currentArrows = this.currentArrows.filter(
        (a) => !(a.from === from && a.to === to && a.color === color),
      );
      this.board.removeArrows(ARROW_TYPES[color], from, to);
      this.annotationRemoved.emit({ type: 'ARROW', color, from, to });
    } else {
      // remove qualquer seta já existente entre as mesmas casas (troca de cor)
      this.currentArrows = this.currentArrows.filter(
        (a) => !(a.from === from && a.to === to),
      );
      this.board.removeArrows(undefined, from, to);
      this.currentArrows.push({ from, to, color });
      this.board.addArrow(ARROW_TYPES[color], from, to);
      this.annotationAdded.emit({ type: 'ARROW', color, from, to });
    }
  }

  private toggleCircle(square: string, color: ModifierColor) {
    const exists = this.currentCircles.some(
      (c) => c.square === square && c.color === color,
    );
    if (exists) {
      this.currentCircles = this.currentCircles.filter(
        (c) => !(c.square === square && c.color === color),
      );
      this.board.removeMarkers(CIRCLE_TYPES[color], square);
      this.annotationRemoved.emit({ type: 'CIRCLE', color, square });
    } else {
      // remove qualquer círculo já existente na casa (troca de cor)
      this.currentCircles = this.currentCircles.filter((c) => c.square !== square);
      this.board.removeMarkers(undefined, square);
      this.currentCircles.push({ square, color });
      this.board.addMarker(CIRCLE_TYPES[color], square);
      this.annotationAdded.emit({ type: 'CIRCLE', color, square });
    }
  }

  private renderAnnotations() {
    if (!this.board) return;
    this.board.removeMarkers();
    this.board.removeArrows();

    for (const circle of this.currentCircles) {
      const type = CIRCLE_TYPES[circle.color] ?? CIRCLE_TYPES['green'];
      this.board.addMarker(type, circle.square);
    }
    for (const arrow of this.currentArrows) {
      const type = ARROW_TYPES[arrow.color] ?? ARROW_TYPES['green'];
      this.board.addArrow(type, arrow.from, arrow.to);
    }
  }

  ngOnDestroy() {
    const el = this.boardElement.nativeElement as HTMLElement;
    if (this.onContextMenu) el.removeEventListener('contextmenu', this.onContextMenu);
    if (this.onMouseDown) el.removeEventListener('mousedown', this.onMouseDown);
    if (this.onMouseUp) {
      el.removeEventListener('mouseup', this.onMouseUp);
      el.removeEventListener('mouseleave', this.onMouseUp);
    }
    if (this.board) {
      this.board.destroy();
    }
  }
}