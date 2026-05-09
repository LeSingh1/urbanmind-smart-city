# UrbanMind `ai_engine` (experimental)

This package holds **research and training code**: PyTorch feature extractors and an optional **Stable Baselines3 (PPO)** policy (`agent/ppo_agent.py`, `agent/policy_network.py`), plus geospatial helpers (`geospatial/osm_processor.py`).

## Relationship to production

The **default simulation worker** (`backend/worker/simulation_job.py`) uses a **deterministic heuristic** placement loop and streams frames over Redis/WebSockets. It does **not** load this PPO policy today.

Use `ai_engine` for offline experiments, retraining, or a future feature flag that swaps the worker’s action selector. Until that integration exists, treat this directory as **non-production**.
