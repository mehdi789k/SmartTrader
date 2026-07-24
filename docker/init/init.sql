-- init.sql: Initialize TimescaleDB extension, hypertables and base schema for Smart-Tred

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- OHLCV data (hypertable)
CREATE TABLE IF NOT EXISTS ohlcv_data (
    time TIMESTAMPTZ NOT NULL,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    open DOUBLE PRECISION,
    high DOUBLE PRECISION,
    low DOUBLE PRECISION,
    close DOUBLE PRECISION,
    tick_volume BIGINT,
    spread DOUBLE PRECISION,
    real_volume BIGINT
);

SELECT create_hypertable('ohlcv_data', 'time', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 day');

-- Compression and index for ohlcv
ALTER TABLE ohlcv_data SET (timescaledb.compress = TRUE, timescaledb.compress_segmentby = 'symbol,timeframe');
SELECT add_compression_policy('ohlcv_data', INTERVAL '30 days');
CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol_time ON ohlcv_data (symbol, time DESC);

-- Indicators data (hypertable)
CREATE TABLE IF NOT EXISTS indicators_data (
    time TIMESTAMPTZ NOT NULL,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    indicator_name TEXT NOT NULL,
    indicator_value DOUBLE PRECISION,
    weight DOUBLE PRECISION DEFAULT 1.0,
    session TEXT,
    news_impact DOUBLE PRECISION
);

SELECT create_hypertable('indicators_data', 'time', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 day');
ALTER TABLE indicators_data SET (timescaledb.compress = TRUE, timescaledb.compress_segmentby = 'symbol,timeframe,indicator_name');
SELECT add_compression_policy('indicators_data', INTERVAL '30 days');
CREATE INDEX IF NOT EXISTS idx_indicators_symbol_time ON indicators_data (symbol, timeframe, time DESC);

-- Tick data (hypertable)
CREATE TABLE IF NOT EXISTS tick_data (
    time TIMESTAMPTZ NOT NULL,
    symbol TEXT NOT NULL,
    price DOUBLE PRECISION,
    volume BIGINT,
    bid DOUBLE PRECISION,
    ask DOUBLE PRECISION
);
SELECT create_hypertable('tick_data', 'time', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 hour');
CREATE INDEX IF NOT EXISTS idx_tick_symbol_time ON tick_data (symbol, time DESC);

-- Predictions (transactional table)
CREATE TABLE IF NOT EXISTS predictions (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    prediction_type TEXT,
    confidence_score DOUBLE PRECISION,
    predicted_price DOUBLE PRECISION,
    target_time TIMESTAMPTZ,
    model_version TEXT,
    features_used JSONB
);
CREATE INDEX IF NOT EXISTS idx_predictions_symbol_time ON predictions (symbol, target_time DESC);

-- Trade results (transactional table)
CREATE TABLE IF NOT EXISTS trade_results (
    id BIGSERIAL PRIMARY KEY,
    prediction_id BIGINT REFERENCES predictions(id) ON DELETE SET NULL,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    entry_time TIMESTAMPTZ,
    exit_time TIMESTAMPTZ,
    entry_price DOUBLE PRECISION,
    exit_price DOUBLE PRECISION,
    lot_size DOUBLE PRECISION,
    profit_loss DOUBLE PRECISION,
    pips DOUBLE PRECISION,
    actual_outcome TEXT,
    slippage DOUBLE PRECISION,
    commission DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS idx_trades_symbol_time ON trade_results (symbol, entry_time DESC);

-- Economic calendar (transactional table)
CREATE TABLE IF NOT EXISTS economic_calendar (
    id BIGSERIAL PRIMARY KEY,
    event_time TIMESTAMPTZ NOT NULL,
    currency TEXT,
    event_name TEXT,
    impact_level TEXT,
    actual_value TEXT,
    forecast_value TEXT,
    previous_value TEXT
);
CREATE INDEX IF NOT EXISTS idx_econ_time_currency ON economic_calendar (event_time DESC, currency);

-- Trading sessions
CREATE TABLE IF NOT EXISTS trading_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_name TEXT NOT NULL,
    start_time TIME WITHOUT TIME ZONE,
    end_time TIME WITHOUT TIME ZONE,
    timezone TEXT
);

-- Helpful composite indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol_timeframe_time ON ohlcv_data (symbol, timeframe, time DESC);
CREATE INDEX IF NOT EXISTS idx_indicators_symbol_timeframe_time ON indicators_data (symbol, timeframe, time DESC);

-- Grant minimal access (optional, can be adjusted later)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO smarttred;

-- End of init.sql
