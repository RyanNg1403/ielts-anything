# Task 1 types in Cambridge IELTS 12–21

Coverage: 36 Cambridge 12–20 stimulus pages were rendered at 110 dpi and inspected. Cambridge 21 contributes four Task 1 records, but the Ppo text pages say their images are missing; those four ledger rows have blank visual fields. Family frequencies and density statistics below use the 36 measured pages only.

## Frequency and measured density

Counts are exclusive ledger families. Density is reported as minimum / median / maximum across measured task stimuli. A time point is a labelled time value; category counts exclude temporal labels. Table rows count data rows, and columns include the row-label column. Mixed records retain component-specific counts in the CSV.

| Family | Frequency | Measured density (min / median / max) |
|---|---:|---|
| line | 5 | series 2 / 3 / 5; time points 5 / 8 / 12 |
| bar | 7 | non-time categories 5 / 6 / 10; series 2 / 2 / 5; time points where shown 2 / 3 / 9 |
| pie | 1 | pies per task 3 / 3 / 3; segments per pie 4 / 4 / 4 |
| table | 1 | tables per task 3 / 3 / 3; data rows per table 3 / 3 / 3; columns per table 2 / 3 / 3 |
| process | 7 | stages 5 / 8 / 9; two unnumbered diagrams use labelled-flow estimates |
| map | 9 | states 2 / 2 / 2; distinct labelled feature classes 9 / 13 / 17 |
| mixed | 6 | visual panels 2 / 2 / 3; compositions listed below |

The mixed ledger records are: bar+table (1), pie+table (1), line+line (1), table+pie (1), pie+bar (1), and pie+table+bar (1). Across the full 40-test set, four further images are unavailable, so those rows cannot be assigned a measured family.

## Line

- **Stimulus pattern:** “The graph below shows” [measure] for [groups/place] from [start] to [end].
- **Density:** 2–5 series and 5–12 labelled time points. Two panels in one prompt are recorded as mixed:line+line.
- **SVG conventions:** Put a concise title above the plot. Label time on the horizontal axis and the measured quantity with its unit on the vertical axis. Use distinct strokes/markers and a legend beside or below the graph; horizontal gridlines appear where a numeric scale needs them. Forecast points can share the historical axis and should be identified in the prompt or plot. Numeric labels at every point are not a consistent convention.
- **Overview and key features:** Following writing.md §2, select the overall direction, relative ranking, major turning points, plateaus, peaks/troughs and useful crossings. Compare start/end levels and notable changes; do not list every point.
- **Minimal JSON shape:**
~~~json
{"kind":"line","title":"","x":{"label":"","points":[]},"y":{"label":"","unit":""},"series":[{"name":"","values":[]}],"legend":"right|bottom"}
~~~

## Bar

- **Stimulus pattern:** “The bar chart below shows” [measure] for [categories/groups] [place/period].
- **Density:** 5–10 non-time categories; 2–5 series. Where years are the horizontal groups, there are 2–9 time points instead.
- **SVG conventions:** The sample set uses horizontal and vertical bars, grouped series, a title above, and axis labels with units when useful. Legends sit below, above or beside the chart. Light gridlines help read numeric scales. Direct values appear on some bars, but not consistently. Use solid, patterned or grey fills to distinguish series in monochrome examples.
- **Overview and key features:** As in writing.md §2, report the largest/smallest groups, leading changes, reversals and meaningful comparisons. Group related categories and cite only enough values to distinguish the main pattern.
- **Minimal JSON shape:**
~~~json
{"kind":"bar","orientation":"vertical|horizontal","title":"","categories":[],"unit":"","series":[{"name":"","values":[]}],"legend":"bottom"}
~~~

## Pie

- **Stimulus pattern:** “The charts below show” [shares] across [parts] for [population/context].
- **Density:** The directly observed pure-pie task has three pies with four segments each. Pie charts also occur inside mixed tasks.
- **SVG conventions:** Keep a short heading over each pie or a shared title above a panel group. The inspected pages print percentages on the slices, either inside or just outside them, and use a compact keyed legend. Use separable grayscale fills or patterns; labels should stay attached to their slice. A time comparison can use separate pies with matching segment styles.
- **Overview and key features:** Point out the dominant and smallest shares, then the main between-pie changes where present. See writing.md §2 for the overview and selection rule.
- **Minimal JSON shape:**
~~~json
{"kind":"pie","title":"","unit":"percent","categories":[{"name":"","share":""}],"labels":"percent"}
~~~

## Table

- **Stimulus pattern:** “The table below shows” [measure] for [entities] across [periods].
- **Density:** The pure-table task contains three compact tables, each with three data rows; the largest has three columns including its row label. Tables also appear in mixed tasks.
- **SVG conventions:** Use a clear caption, a stable first column for row labels, visible cell boundaries, and grouped or merged headings when a table compares multiple measures. Put units in headings and align numbers consistently. For a set of related tables, keep year and population headers in the same position. Do not add color where the original only relies on rules and typography.
- **Overview and key features:** In writing.md §2, the overview names the broad shift or contrast; key features select the largest changes and comparisons among rows/columns rather than reciting every cell.
- **Minimal JSON shape:**
~~~json
{"kind":"table","title":"","columns":[{"name":"","unit":""}],"rows":[{"label":"","values":[]}],"headerGroups":[]}
~~~

## Process

- **Stimulus pattern:** “The diagram below shows how” [input/material] is [transformed into output].
- **Density:** 5–9 stages in this sample. Numbered stages give a direct count; the unnumbered hydroelectric and ethanol-cycle diagrams are counted from labelled flow steps and marked as estimates in the ledger.
- **SVG conventions:** Put the diagram title above the drawing. Link stages with directional arrows and keep labels next to the relevant action, material or output. The books use left-to-right and serpentine sequences as well as loops; numbered circles appear on several examples but are not universal. Use simple monochrome icons or restrained grey fills to distinguish equipment/materials. Preserve branches and return flows; arrowheads must make direction clear.
- **Overview and key features:** Per writing.md §2, summarize input, broad sequence/branches and final output, or name the cycle and its return path. Then describe the major transformations in diagram order.
- **Minimal JSON shape:**
~~~json
{"kind":"process","title":"","nodes":[{"id":"","label":"","icon":""}],"edges":[{"from":"","to":"","label":""}],"cycle":false}
~~~

## Map

- **Stimulus pattern:** “The maps below show” [site] at [state/date A] and [state/date B].
- **Density:** All nine measured map tasks have two states and 9–17 distinct labelled feature classes. No scale bar appeared on these nine pages.
- **SVG conventions:** Label each state and date directly above its plan; keep corresponding sites aligned for comparison. Several plans use a compass rose, while symbol or hatch keys are present only when the plan needs them. Roads, paths, buildings, entrances and land uses are labelled in place. Direct labels are more common than a separate legend. No map used a scale bar in this sample, so add one only when the generated spatial data requires metric interpretation. Preserve roads and buildings across before/after states and show additions, removals and replacements clearly. Most pages are monochrome; one harbour plan uses a light blue water tint.
- **Overview and key features:** As in writing.md §2, identify the broad redevelopment or stable layout first, then group major additions, removals, replacements and unchanged landmarks by area.
- **Minimal JSON shape:**
~~~json
{"kind":"map","title":"","states":[{"label":"","features":[{"id":"","kind":"","label":"","x":"","y":""}]}],"compass":false,"key":[]}
~~~

## Mixed

- **Stimulus pattern:** [The chart/table/diagram/maps] below give information on [related measures]; name each component and how it connects to the other.
- **Density:** Six measured prompts use 2–3 visual panels. Component layouts are bar+table, pie+table, line+line, table+pie, pie+bar and pie+table+bar.
- **SVG conventions:** Give each component its own short title and preserve a shared time period, population and unit where appropriate. Keep labels and legends local to their graphic; align the components so their relationship is apparent. Mixed tasks combine units and should not silently merge their scales.
- **Overview and key features:** Use the relevant writing.md §2 overview for each component, then connect the most important cross-panel relationship. Avoid describing one panel while omitting the other.
- **Minimal JSON shape:**
~~~json
{"kind":"mixed","components":[{"kind":"bar|line|pie|table|map|process","data":{}}],"sharedContext":{"population":"","period":"","unit":""}}
~~~

## Measurement notes

See gaps.md for the map-feature counting rule, table aggregation rule, estimates, source-page conventions, and Cambridge 21 image gaps. No chart data values or full prompts are reproduced.
