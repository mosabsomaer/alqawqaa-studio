# Yellow-template print architecture

The clinic hand-fills a pre-printed yellow A4 sheet. We now support printing onto
that sheet directly, so the app must be able to emit *only the doctor's answers*,
landing them exactly where the printed boxes are.

## Two layers, one geometry

```
<div class="sheet">                            210 x 297 mm, position: relative
├── <svg class="template-chrome" viewBox="0 0 210 297">
│      every printed line, box, axis label, logo, footer, vertical side text
│      -> hidden in preprinted mode, because the paper already has it
└── <div class="template-ink">               calibration transform lives here
    ├── <svg class="sheet-layer" viewBox="0 0 210 297">
    │      symbols, curves, ticks           -> always printed
    └── absolutely positioned HTML inputs   -> always printed
```

Panels contribute **fragments** to those shared roots, never their own `<svg>`
or their own positioned wrapper. Each panel exports up to three:

| export | kind | goes into |
| --- | --- | --- |
| `XChrome` | SVG fragment | the chrome `<svg>` |
| `XInk` | SVG fragment | the ink `<svg>` |
| `XFields` | HTML fragment, `position:absolute` in mm, each `data-ink` | the ink `<div>` |

Fragments emit absolute page coordinates in millimetres and set no
width/height/viewBox of their own.

Both layers use the **same viewBox**, so a coordinate in one is the same
coordinate in the other. That is the whole trick: registration is structural, not
something anyone has to keep in sync by hand.

`formSpec.ts` owns the numbers both layers read. Panels own their own local
geometry but must derive it from `FRAME` in `formSpec.ts`, never from magic
numbers relative to the page.

## Why SVG and not canvas

The old charts were `react-konva`. SVG replaces them here for two reasons:
printing a canvas rasterises it at screen resolution, which is visibly soft on
paper, and canvas needs a px-per-mm conversion that is one more place for the two
layers to drift apart. SVG in millimetre units has neither problem.

## Print modes

`PrintMode` is `'plain' | 'preprinted'`.

- **plain**: white paper, chrome + ink, today's behaviour.
- **preprinted**: yellow stock already carries the template, so chrome is hidden
  and only ink prints.

The mode is on `document.body[data-print-mode]`. Hiding is a single CSS rule:

```css
@media print {
  body[data-print-mode='preprinted'] .template-chrome { display: none; }
}
```

Because chrome is one self-contained SVG that never wraps ink, `display: none`
is safe: no ink is nested inside it, so nothing shifts.

## Calibration

Printers feed pre-printed stock a millimetre or two off. `Calibration`
(`offsetX`, `offsetY`, `scale`) is user-set, persisted, and applied as a single
transform on the ink layer in preprinted mode. It must never be applied to the
chrome layer or to on-screen editing.

## Rules for panel components

1. Export **one** `<PanelChrome />` and **one** `<PanelInk />` per panel. Chrome
   is pure static output with no props beyond geometry; ink takes value + onChange.
2. Emit SVG in millimetres. No `px` anywhere in the sheet.
3. Never put an ink element inside the chrome SVG, or it will vanish on yellow paper.
4. Stroke widths: hairline grid `0.15`, normal rule `0.25`, heavy rule `0.5`,
   outer frame `0.7`. Chrome ink colour `#4a4a3f` on screen (matches the scan's
   faded brown), pure `#000` when printing plain.
5. Text: `font-family: Arial, Helvetica, sans-serif`. Sizes are in mm
   (`font-size="2.6"` etc). Arabic runs need `direction: rtl`.
6. Interactive ink (inputs, draggable symbols) must carry `data-ink` so the
   calibration transform and the print CSS can find it.
