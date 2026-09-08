# G-8 Awards Workspace

Static browser application for reviewing end-of-cycle awards from an uploaded RAW-Data Excel workbook. Employee data is processed in memory on the user's device. No backend, analytics, uploaded datasets, or browser persistence is used. Export before clearing or closing the session.

## Use

Upload an .xlsx HR data pull, adjust scores and award choices, review budget and award reports, and export the calculated workbook. QSI selections and final award decisions require human review.

## Corrected calculations

All populated employee rows are included. Month proration is months / 12. Cash allocations use largest-remainder whole-dollar rounding to reconcile to the selected pool, with uploaded row order resolving ties. Zero eligible cash shares leave the pool unallocated. QSI slots are floor(employee count × configured limit). Scores below 3 produce zero award shares. Grade weighting uses mean salary relative to grade 11 by default, matching the master formula, and can be changed to equal weighting.

Default salary budget: 2.4%; rating-based split: 97%; NRB split: 3%. The source workbook parameters override defaults. TOA hours use 40 × score / 5 × selected time fraction × month proration; reference value uses annual salary / 2080. Hourly source pay is annualized with 2087 hours, as in the source workbook.

## Azure Static Web Apps

Use the Free plan, GitHub source, main branch, Custom build preset, app location `/`, empty API location, and output location `dist`. Azure installs the pinned ExcelJS dependency and runs `npm run build`. The included Azure configuration defines the module MIME type and blocks outbound data connections.

## Dependencies

ExcelJS 4.4.0 is installed during the build and copied into the deployment with its MIT license; the browser loads it from the same website. Application files are static HTML/CSS/ES modules. No employee fixtures or reference workbooks belong in this repository.
