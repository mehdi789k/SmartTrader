import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix='/api/v1/settings', tags=['settings'])

SETTINGS_FILE = Path(__file__).resolve().parents[2] / 'data' / 'user_settings.json'
SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)


class SettingsPayload(BaseModel):
    riskPercent: int | None = Field(default=2, ge=1, le=5)
    defaultLot: float | None = Field(default=0.1, ge=0.01)
    refreshInterval: str | None = Field(default='1m')
    autoTradingEnabled: bool | None = Field(default=False)


class SettingsResponse(BaseModel):
    success: bool
    data: dict[str, Any]


def _default_settings() -> dict[str, Any]:
    return {
        'riskPercent': 2,
        'defaultLot': 0.1,
        'refreshInterval': '1m',
        'autoTradingEnabled': False,
    }


def _load_settings() -> dict[str, Any]:
    if not SETTINGS_FILE.exists():
        return _default_settings()

    try:
        with SETTINGS_FILE.open('r', encoding='utf-8') as handle:
            data = json.load(handle)
            if isinstance(data, dict):
                return {**_default_settings(), **data}
    except (json.JSONDecodeError, OSError):
        return _default_settings()

    return _default_settings()


def _save_settings(data: dict[str, Any]) -> None:
    with SETTINGS_FILE.open('w', encoding='utf-8') as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)


@router.get('', response_model=SettingsResponse)
async def get_settings() -> SettingsResponse:
    return SettingsResponse(success=True, data=_load_settings())


@router.post('', response_model=SettingsResponse)
async def create_or_update_settings(payload: SettingsPayload) -> SettingsResponse:
    current = _load_settings()
    merged = {**current, **payload.model_dump(exclude_none=True)}
    _save_settings(merged)
    return SettingsResponse(success=True, data=merged)


@router.put('', response_model=SettingsResponse)
async def replace_settings(payload: SettingsPayload) -> SettingsResponse:
    merged = {**_default_settings(), **payload.model_dump(exclude_none=True)}
    _save_settings(merged)
    return SettingsResponse(success=True, data=merged)


@router.delete('', response_model=SettingsResponse)
async def delete_settings() -> SettingsResponse:
    _save_settings(_default_settings())
    return SettingsResponse(success=True, data=_default_settings())
