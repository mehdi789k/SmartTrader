"""
SQLAlchemy ORM models for Smart-Tred database tables
تمام مدل‌ها با type hints و کامنت‌های فارسی
"""
from sqlalchemy import (
    Table, Column, Integer, BigInteger, String, Text, Float, DateTime, JSON, MetaData, ForeignKey
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()
metadata = MetaData()

class OHLCVData(Base):
    """داده‌های خام OHLCV برای هر نماد و تایم‌فریم"""
    __tablename__ = 'ohlcv_data'

    # توجه: این جدول در init.sql به‌عنوان hypertable ساخته می‌شود
    time = Column(DateTime(timezone=True), primary_key=True, nullable=False)
    symbol = Column(String, primary_key=True, nullable=False)
    timeframe = Column(String, primary_key=True, nullable=False)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    tick_volume = Column(BigInteger)
    spread = Column(Float)
    real_volume = Column(BigInteger)

class IndicatorsData(Base):
    """اندیکاتورها با وزن‌دهی برای هر نماد/تایم‌فریم"""
    __tablename__ = 'indicators_data'

    time = Column(DateTime(timezone=True), primary_key=True, nullable=False)
    symbol = Column(String, primary_key=True, nullable=False)
    timeframe = Column(String, primary_key=True, nullable=False)
    indicator_name = Column(String, primary_key=True, nullable=False)
    indicator_value = Column(Float)
    weight = Column(Float, default=1.0)
    session = Column(String)
    news_impact = Column(Float)

class TickData(Base):
    """داده‌های تیک در صورت نیاز"""
    __tablename__ = 'tick_data'

    time = Column(DateTime(timezone=True), primary_key=True, nullable=False)
    symbol = Column(String, primary_key=True, nullable=False)
    price = Column(Float)
    volume = Column(BigInteger)
    bid = Column(Float)
    ask = Column(Float)

class Prediction(Base):
    """پیش‌بینی‌های مدل‌های AI"""
    __tablename__ = 'predictions'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True))
    symbol = Column(String, nullable=False)
    timeframe = Column(String, nullable=False)
    prediction_type = Column(String)
    confidence_score = Column(Float)
    predicted_price = Column(Float)
    target_time = Column(DateTime(timezone=True))
    model_version = Column(String)
    features_used = Column(JSON)

    trades = relationship('TradeResult', back_populates='prediction')

class TradeResult(Base):
    """نتایج تریدها برای ارزیابی عملکرد مدل"""
    __tablename__ = 'trade_results'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    prediction_id = Column(BigInteger, ForeignKey('predictions.id'))
    symbol = Column(String, nullable=False)
    timeframe = Column(String, nullable=False)
    entry_time = Column(DateTime(timezone=True))
    exit_time = Column(DateTime(timezone=True))
    entry_price = Column(Float)
    exit_price = Column(Float)
    lot_size = Column(Float)
    profit_loss = Column(Float)
    pips = Column(Float)
    actual_outcome = Column(String)
    slippage = Column(Float)
    commission = Column(Float)

    prediction = relationship('Prediction', back_populates='trades')

class EconomicCalendar(Base):
    """اخبار اقتصادی و تأثیرات آن‌ها"""
    __tablename__ = 'economic_calendar'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    event_time = Column(DateTime(timezone=True), nullable=False)
    currency = Column(String)
    event_name = Column(String)
    impact_level = Column(String)
    actual_value = Column(String)
    forecast_value = Column(String)
    previous_value = Column(String)

class TradingSession(Base):
    """تعریف سشن‌های معاملاتی مثل Asian, London, New York"""
    __tablename__ = 'trading_sessions'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_name = Column(String, nullable=False)
    start_time = Column(String)  # Stored as HH:MM (without timezone)
    end_time = Column(String)
    timezone = Column(String)
