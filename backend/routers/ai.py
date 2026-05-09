import asyncio
import hashlib
import json
import logging

from anthropic import AsyncAnthropic
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_session
from models.zone_explanation import ZoneExplanation

logger = logging.getLogger(__name__)

router = APIRouter()


class PlanningRationaleRequest(BaseModel):
    district_name: str
    largest_gap_type: str
    infrastructure_type: str
    population_served: int = Field(ge=0)
    fifteen_minute_city_score: int = Field(ge=0)
    template_rationale: str
    scenario_goal: str = "Balanced sustainable planning"


def _fallback_planning_rationale(body: PlanningRationaleRequest) -> str:
    return body.template_rationale


async def _generate_planning_rationale_llm(body: PlanningRationaleRequest) -> str:
    if not settings.anthropic_api_key or str(settings.anthropic_api_key).startswith("sk-ant-YOUR"):
        return _fallback_planning_rationale(body)

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    prompt = (
        "You are an urban planner writing ONE short paragraph (under 90 words) explaining why the following "
        "infrastructure recommendation is justified. Use only facts implied by the structured fields; "
        "do not invent new facilities, costs, or population counts.\n\n"
        f"District: {body.district_name}\n"
        f"Largest access gap type: {body.largest_gap_type}\n"
        f"Recommended infrastructure: {body.infrastructure_type}\n"
        f"Population served (engine estimate): {body.population_served}\n"
        f"15-minute city score: {body.fifteen_minute_city_score}\n"
        f"Scenario goal: {body.scenario_goal}\n"
        f"Deterministic summary (must stay consistent with these numbers): {body.template_rationale}\n"
    )

    async def _call():
        response = await client.messages.create(
            model=settings.claude_model,
            max_tokens=220,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    try:
        return await asyncio.wait_for(_call(), timeout=12.0)
    except Exception as exc:
        logger.warning("planning-rationale LLM failed: %s", exc)
        return _fallback_planning_rationale(body)


@router.post("/planning-rationale")
async def planning_rationale(body: PlanningRationaleRequest):
    """Layer 2.5 — rationale text only; placements and metrics come from the frontend gap engine."""
    text = await _generate_planning_rationale_llm(body)
    return {"rationale": text}


class ExplainRequest(BaseModel):
    zone_type_id: str
    zone_display_name: str
    city_name: str
    surrounding_context: dict | str
    metrics_delta: dict
    scenario_goal: str


def _context_hash(body: ExplainRequest) -> str:
    payload = body.model_dump(mode="json")
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


async def _generate_explanation(body: ExplainRequest) -> str:
    if not settings.anthropic_api_key or settings.anthropic_api_key.startswith("sk-ant-YOUR"):
        return (
            f"{body.zone_display_name} is a reasonable placement for {body.city_name} because it responds to "
            f"the surrounding land use, the scenario goal, and the latest planning metrics."
        )

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    prompt = (
        "Write a concise urban planning explanation for a zoning decision.\n"
        f"Zone: {body.zone_display_name} ({body.zone_type_id})\n"
        f"City: {body.city_name}\n"
        f"Surrounding context: {body.surrounding_context}\n"
        f"Metrics delta: {body.metrics_delta}\n"
        f"Scenario goal: {body.scenario_goal}\n"
        "Keep it practical, specific, and under 90 words."
    )
    response = await client.messages.create(
        model=settings.claude_model,
        max_tokens=180,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


@router.post("/explain")
async def explain_placement(body: ExplainRequest, session: AsyncSession = Depends(get_session)):
    context_hash = _context_hash(body)
    cached = (
        await session.execute(select(ZoneExplanation).where(ZoneExplanation.context_hash == context_hash))
    ).scalar_one_or_none()
    if cached:
        return {"explanation_text": cached.explanation_text, "cached": True}

    explanation = await _generate_explanation(body)
    session.add(
        ZoneExplanation(
            context_hash=context_hash,
            zone_type=body.zone_type_id,
            explanation_text=explanation,
        )
    )
    await session.commit()
    return {"explanation_text": explanation, "cached": False}
