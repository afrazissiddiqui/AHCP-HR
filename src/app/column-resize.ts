import { Directive, ElementRef, Renderer2, OnInit } from "@angular/core";

@Directive({
  selector: "[appColumnResize]",
  standalone: true,
})
export class ColumnResizeDirective implements OnInit {
  private startX!: number;
  private startWidth!: number;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    const th = this.el.nativeElement;

    this.renderer.setStyle(th, "position", "relative");

    const resizer = this.renderer.createElement("span");
    this.renderer.addClass(resizer, "resize-handle");
    this.renderer.appendChild(th, resizer);

    this.renderer.listen(resizer, "mousedown", (event: MouseEvent) => {
      event.preventDefault();

      this.startX = event.pageX;
      this.startWidth = th.offsetWidth;

      const table = th.closest("table");
      const index = th.cellIndex;

      const mouseMove = this.renderer.listen(
        "document",
        "mousemove",
        (e: MouseEvent) => {
          const delta = e.pageX - this.startX;
          const newWidth = this.startWidth + delta;

          if (newWidth < 60) return;

          if (!table) return;

          // APPLY TO ALL ROWS (HEADER + BODY)
          const rows = table.querySelectorAll("tr");

          rows.forEach((row: HTMLTableRowElement) => {
            const cell = row.children[index] as HTMLElement;

            if (cell) {
              this.renderer.setStyle(cell, "width", `${newWidth}px`);
              this.renderer.setStyle(cell, "min-width", `${newWidth}px`);
              this.renderer.setStyle(cell, "max-width", `${newWidth}px`);
            }
          });
        }
      );

      const mouseUp = this.renderer.listen("document", "mouseup", () => {
        mouseMove();
        mouseUp();
      });
    });
  }
}