# Desy — Creative Workspace Prototype

A frontend-only React + TypeScript + Vite portfolio prototype.

## Run locally

```bash
npm install
npm run dev
```

Open the localhost address shown in the terminal.

## Included

- **Home** — clean pastel dashboard with no preset projects.
- **My Projects** — create event or interior projects; project cards are generated from your own data.
- **Moodboards** — create blank grid boards; upload images; drag text, notes, and highlights; connect elements with arrows; resize/recolor selected items.
- **Spreadsheets** — four pastel templates, editable cells, basic formulas (`=2+3`, `=SUM(C2:C8)`), CSV export.
- **Layout Studio** — upload a room reference photo, place and drag simple furniture/event shapes on a 2D grid.
- **Planner** — tasks with due dates, priorities, statuses, and Board/List/Calendar views.

All data is saved in browser localStorage under `desy-v2`. No accounts or backend. Avoid uploading large images: browser storage is limited. Uploaded images and projects are local to that browser/device.

## Scope

This is a functioning **prototype**, not a complete replacement for Figma, Miro, Google Sheets, or CAD software. Moodboards have a fixed large canvas; spreadsheet formulas support arithmetic and `SUM` ranges only; layouts are not dimension-accurate. Reminders are represented by task due dates in the Planner and do not send push notifications.

## Latest workspace additions

- Personalize project cards with an optional image, color, or cover text. You can change their appearance from the project library.
- Set the background color for each moodboard; free text is transparent rather than a sticky-note card.
- Add rectangular or round tables and rugs, plus event elements such as entryways, decor stations, gift tables, food stations, dance floors, photo booths, and stages.
- Planner calendar tasks can be colored by category or priority.
- Spreadsheet formulas support arithmetic, cell references (e.g. `=C2*D2`), `SUM`, `AVERAGE`, `AVG`, `MIN`, `MAX`, and `COUNT` over ranges.

Data continues to be saved locally under `desy-v2`.

## Professional editor update
- Moodboards and Layout Studio include layer lists with selection, visibility, locking and reordering.
- Layout Studio has a precision inspector, snap toggle, basic object alignment guides, presentation view, PNG export and browser Print / Save as PDF.
- A subtle lavender cursor follows mouse pointers (disabled on touch devices).
- The Pan tool is currently a non-editing viewing mode, and Measure shows room measurements; neither is yet a full pan/measurement interaction.
- Images are stored in browser localStorage, so large uploads may exceed browser storage limits.
- To test: `npm install`, `npm run build`, `npm run dev`.
