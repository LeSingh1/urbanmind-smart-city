# UrbanMind AI

> AI-powered smart city expansion planner for the AI Autonomous Smart City Hackathon 2026.

[Demo Video Link] | [Live Demo] | [Documentation]

## What It Does

UrbanMind AI helps planners explore how real cities can expand over the next 50 years. It combines live city maps, zoning constraints, infrastructure placement, growth metrics, and AI-generated planning explanations into one interactive simulation.

The app lets a user select one of nine global cities, choose a planning scenario, and watch an autonomous agent place housing, roads, services, utilities, parks, and resilience infrastructure year by year. The map, metrics, charts, timeline, and AI decision history update as the simulation runs.

The impact is a faster way to compare urban futures. Planners can test growth-first, equity-first, climate-resilient, historic, and balanced strategies, then export a professional report that explains tradeoffs in population, mobility, emissions, green space, infrastructure load, and public-service coverage.

## Quick Start

```bash
git clone https://github.com/yourusername/urbanmind-ai
cd urbanmind-ai
cp .env.example .env
# Add ANTHROPIC_API_KEY and MAPBOX_TOKEN to .env
docker-compose up
# Open http://localhost
```

## Tech Stack

React, TypeScript, Vite, Mapbox GL, D3, Zustand, Framer Motion, Python, FastAPI, PostgreSQL/PostGIS, Redis, RQ, MinIO, Docker Compose, OSMnx, GeoPandas, PyTorch, Stable Baselines3, Anthropic Claude.

## Architecture

UrbanMind uses a **deterministic infrastructure gap engine** plus an **AI copilot**, with a **validation layer** between them. The mental model is a bounded planning decision system: the engine computes truth from data, the copilot explains and ranks, the validator gates every output before it touches map state. The AI does not place infrastructure — the engine does. The AI explains why.

### Layer 1 — Gap Engine (deterministic)

The engine in `frontend/src/engine/gapEngine.ts` analyzes each district for clinic, school, park, transit, and emergency access. It uses pure scoring functions — no LLM calls, no side effects — so the same inputs always produce the same gap reports. Coverage is approximated with haversine distance and a 1.4× detour factor (documented in code) since the demo has no routing engine. Output is `DistrictGapReport[]` ranked by severity and population affected.

### Layer 2 — AI Copilot (explanation)

The copilot in `frontend/src/copilot/copilot.ts` converts engine output into prioritized planning alerts and validated recommendations. It does not invent placements, costs, or population numbers — those all come from the engine and a hardcoded cost table. The copilot's only LLM-shaped responsibility is generating the rationale string, and that has a template fallback so the system works without an API key configured.

### Layer 3 — Validator

Every copilot recommendation is gated by 12 rules in `frontend/src/validation/validator.ts`:
must reference a real district gap; type must address an actual access deficit; type must match the engine's choice or a sensible substitute; placement must lie inside district bounds; must avoid invalid terrain (river, reservoir, protected mask in `frontend/src/data/fremonTerrain.ts`); must improve at least one metric; impact deltas must be plausible; cost must be in the expected band; population served must be positive; must not duplicate an existing facility within 250m; coverage radius must be defined for the type; confidence must be in [0, 100]. Confidence decays by 30 with 1–2 failures, drops to 0 with 3 or more.

Failed recommendations never reach map state — they fall back to the engine's deterministic recommendation and are logged via `console.warn`. Append `?debug=1` to the URL to surface a panel listing every recommendation, its validation status, and the per-rule failure reasons.

This three-layer structure means UrbanMind is a bounded planning decision system, not an AI chatbot with a map. The engine ensures correctness, the copilot accelerates explanation, validation enforces trust.

### What the simulation does

The user picks a city, runs Analyze, scrubs a year-by-year timeline (decade chips for 2026/2030/2040/.../2080), and watches underserved zones grow more stressed as population rises. Apply Plan drops engine-validated infrastructure with cyan coverage rings, deltas animate up, and the report modal opens after a brief generation step. The Copilot panel narrates each stage with character-by-character typed text.

## Features

- Real-city planning for New York, Los Angeles, Tokyo, Lagos, London, Sao Paulo, Singapore, Dubai, and Mumbai
- Year-by-year WebSocket simulation playback
- Mapbox zones, roads, heatmaps, and 3D building extrusions
- Scenario selector for balanced, max growth, climate resilient, equity focused, and historic plans
- Six live D3 dashboard charts
- AI decision tooltips and explanation drawer
- Split-screen scenario comparison
- Procedural sandbox city generator
- ReportLab PDF export
- Keyboard navigation, ARIA labels, and color-blind-friendly secondary cues

## Screenshots

- Landing and city gallery
- Tokyo simulation map
- Analytics dashboard
- AI explanation tooltip
- Split-screen comparison
- Sandbox terrain generator
- PDF report export

## Hackathon Category

Smart Traffic and Mobility, Smart Energy Management, Urban Healthcare, and Public Safety Infrastructure.

## Team

See `members.csv` for team roster details.

## License

MIT

## Demo Video Script

0:00-0:30: Show Tokyo at Year 2074 and introduce the 50-year planning question.

0:30-1:20: Open the gallery, select Lagos, and choose the Equity Focused scenario.

1:20-2:30: Run playback at 10x. Pause at Year 20 and hover a hospital placement to show the AI explanation.

2:30-3:15: Demonstrate a manual override and show how metrics respond.

3:15-4:00: Open the dashboard and explain the population timeline, radar chart, and infrastructure scatter.

4:00-4:30: Compare Equity Focused against Max Growth in split-screen mode.

4:30-5:00: Generate a coastal sandbox city, start the simulation, and export the PDF report.
