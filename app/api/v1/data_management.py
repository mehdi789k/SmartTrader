from fastapi import APIRouter, Body, HTTPException, Depends
from typing import Optional
from datetime import datetime
import logging

from ...core import token_manager
from ...services import mt5_data_extractor, indicator_calculator, data_archiver, ml_data_loader
from ...core.database import get_db

router = APIRouter(prefix='/api/v1/data', tags=['data-management'])
logger = logging.getLogger(__name__)


def _require_auth(authorization: str = Depends(lambda: None)):
    # lightweight placeholder; real auth uses token header in routes
    return True


@router.post('/extract')
async def extract_data(payload: dict = Body(...)):
    symbol = payload.get('symbol')
    timeframe = payload.get('timeframe', 'H1')
    if not symbol:
        raise HTTPException(status_code=400, detail='symbol is required')
    start = payload.get('start_date')
    end = payload.get('end_date')
    start_dt = datetime.fromisoformat(start) if start else None
    end_dt = datetime.fromisoformat(end) if end else None
    count = await mt5_data_extractor.extract_ohlcv(symbol, timeframe, start_dt, end_dt)
    return {'success': True, 'inserted': count}


@router.post('/calculate-indicators')
async def calculate_indicators(payload: dict = Body(...)):
    symbol = payload.get('symbol')
    timeframe = payload.get('timeframe', 'H1')
    if not symbol:
        raise HTTPException(status_code=400, detail='symbol is required')
    # load recent OHLCV for symbol/timeframe
    count = payload.get('count', 500)
    # use mt5 service to fetch recent candles synchronously via threadpool inside the service
    res = await mt5_data_extractor.extract_ohlcv(symbol, timeframe)
    # For now, retrieve candles directly from MT5 service
    # TODO: consider reading from DB instead to use canonical data
    loop = __import__('asyncio').get_running_loop()
    raw = await loop.run_in_executor(None, lambda: __import__('json'))
    # placeholder: compute nothing
    return {'success': True, 'computed': 0}


@router.post('/archive')
async def archive(payload: dict = Body(...)):
    symbol = payload.get('symbol')
    timeframe = payload.get('timeframe', 'H1')
    days = int(payload.get('days_old', 30))
    if not symbol:
        raise HTTPException(status_code=400, detail='symbol is required')
    path = await data_archiver.archive_to_parquet(symbol, timeframe, days_old=days)
    if not path:
        return {'success': False, 'message': 'no data archived'}
    return {'success': True, 'path': str(path)}


@router.get('/ohlcv/{symbol}/{timeframe}')
async def get_ohlcv(symbol: str, timeframe: str, limit: int = 500):
    # simple pass-through to MT5 service for now
    loop = __import__('asyncio').get_running_loop()
    res = await loop.run_in_executor(None, lambda: __import__('asyncio'))
    return {'success': True, 'source': 'mt5', 'data': []}


@router.get('/indicators/{symbol}/{timeframe}')
async def get_indicators(symbol: str, timeframe: str, limit: int = 500):
    return {'success': True, 'data': []}


@router.get('/ml/training-data/{symbol}/{timeframe}')
async def get_training_data(symbol: str, timeframe: str, start: Optional[str] = None, end: Optional[str] = None):
    if not start or not end:
        raise HTTPException(status_code=400, detail='start and end required')
    start_dt = datetime.fromisoformat(start)
    end_dt = datetime.fromisoformat(end)
    df = await ml_data_loader.load_training_data(symbol, timeframe, start_dt, end_dt)
    if df is None:
        return {'success': False, 'data': None}
    # convert to records
    return {'success': True, 'rows': df.to_dict(orient='records')}


@router.post('/ml/predictions')
async def save_prediction(payload: dict = Body(...)):
    # minimal save for predictions
    from ...core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        try:
            ins = (
                "INSERT INTO predictions(symbol, timeframe, prediction_type, confidence_score, predicted_price, target_time, model_version, features_used) "
                "VALUES(:symbol,:timeframe,:prediction_type,:confidence_score,:predicted_price,:target_time,:model_version,:features_used) RETURNING id"
            )
            params = {
                'symbol': payload.get('symbol'),
                'timeframe': payload.get('timeframe'),
                'prediction_type': payload.get('prediction_type'),
                'confidence_score': payload.get('confidence_score'),
                'predicted_price': payload.get('predicted_price'),
                'target_time': payload.get('target_time'),
                'model_version': payload.get('model_version'),
                'features_used': payload.get('features_used') or {}
            }
            res = await session.execute(ins, params)
            await session.commit()
            newid = res.scalar_one_or_none()
            return {'success': True, 'id': newid}
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=str(e))


@router.post('/ml/trade-results')
async def save_trade_result(payload: dict = Body(...)):
    async with AsyncSessionLocal() as session:
        try:
            ins = (
                "INSERT INTO trade_results(prediction_id, symbol, timeframe, entry_time, exit_time, entry_price, exit_price, lot_size, profit_loss, pips, actual_outcome, slippage, commission) "
                "VALUES(:prediction_id,:symbol,:timeframe,:entry_time,:exit_time,:entry_price,:exit_price,:lot_size,:profit_loss,:pips,:actual_outcome,:slippage,:commission) RETURNING id"
            )
            params = {
                'prediction_id': payload.get('prediction_id'),
                'symbol': payload.get('symbol'),
                'timeframe': payload.get('timeframe'),
                'entry_time': payload.get('entry_time'),
                'exit_time': payload.get('exit_time'),
                'entry_price': payload.get('entry_price'),
                'exit_price': payload.get('exit_price'),
                'lot_size': payload.get('lot_size'),
                'profit_loss': payload.get('profit_loss'),
                'pips': payload.get('pips'),
                'actual_outcome': payload.get('actual_outcome'),
                'slippage': payload.get('slippage'),
                'commission': payload.get('commission'),
            }
            res = await session.execute(ins, params)
            await session.commit()
            newid = res.scalar_one_or_none()
            return {'success': True, 'id': newid}
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=str(e))
