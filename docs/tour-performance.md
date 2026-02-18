# Tour Performance Baseline and Verification

This project includes lightweight Tour instrumentation for server/client timings and a smoke benchmark script.

## 1) Run baseline

Start the app:

`bun run dev`

In a second terminal:

`TOUR_SAMPLE_SLUG=<lesson-slug> bun run perf:tour`

The script reports response size and timing stats for:
- `/tour`
- `/tour/<lesson-slug>`

## 2) Optional verbose timing logs

Enable logs for local verification:

`ENABLE_TOUR_PERF=1 bun run dev`

You will see metrics such as:
- `tour_index_list_query_ms`
- `tour_lesson_query_ms`
- `tour_lesson_first_paint_from_mount_ms`

## 3) Compare before/after

Use the same sample count and lesson slug in both runs:
- `TOUR_SAMPLES=5 TOUR_SAMPLE_SLUG=<lesson-slug> bun run perf:tour`

Track:
- `/tour` latency distribution (min/p50/p95/avg)
- `/tour/<lesson>` latency distribution
- response bytes for each route

For UI interaction quality (LCP/INP/hydration), use Chrome Performance + Web Vitals in DevTools on the same pages.
