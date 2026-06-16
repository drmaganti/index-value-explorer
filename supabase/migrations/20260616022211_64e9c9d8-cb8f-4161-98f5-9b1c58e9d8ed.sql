
-- Index constituents: which tickers make up SPY / QQQ / DIA, versioned by snapshot date
CREATE TABLE public.index_constituents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  index_symbol TEXT NOT NULL,
  ticker TEXT NOT NULL,
  company_name TEXT,
  sector TEXT,
  weight NUMERIC,
  provider TEXT,
  as_of_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (index_symbol, ticker, as_of_date)
);

CREATE INDEX idx_index_constituents_active
  ON public.index_constituents (index_symbol, is_active, as_of_date DESC);

GRANT SELECT ON public.index_constituents TO anon;
GRANT SELECT ON public.index_constituents TO authenticated;
GRANT ALL ON public.index_constituents TO service_role;

ALTER TABLE public.index_constituents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read index constituents"
  ON public.index_constituents FOR SELECT
  USING (true);

-- Daily stock snapshots: one EOD row per ticker per trade_date
CREATE TABLE public.stock_daily_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  trade_date DATE NOT NULL,
  close_price NUMERIC,
  previous_close NUMERIC,
  fifty_two_week_high NUMERIC,
  fifty_two_week_low NUMERIC,
  two_hundred_day_moving_average NUMERIC,
  market_cap_b NUMERIC,
  forward_pe NUMERIC,
  trailing_pe NUMERIC,
  ev_to_ebitda NUMERIC,
  price_to_book NUMERIC,
  revenue_growth NUMERIC,
  earnings_growth NUMERIC,
  operating_margin NUMERIC,
  gross_margin NUMERIC,
  return_on_equity NUMERIC,
  free_cash_flow_b NUMERIC,
  debt_to_equity NUMERIC,
  beta NUMERIC,
  sector TEXT,
  industry TEXT,
  provider_primary TEXT,
  provider_secondary TEXT,
  data_completeness_pct INTEGER,
  missing_data_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ticker, trade_date)
);

CREATE INDEX idx_stock_snapshots_ticker_date
  ON public.stock_daily_snapshots (ticker, trade_date DESC);
CREATE INDEX idx_stock_snapshots_date
  ON public.stock_daily_snapshots (trade_date DESC);

GRANT SELECT ON public.stock_daily_snapshots TO anon;
GRANT SELECT ON public.stock_daily_snapshots TO authenticated;
GRANT ALL ON public.stock_daily_snapshots TO service_role;

ALTER TABLE public.stock_daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read stock snapshots"
  ON public.stock_daily_snapshots FOR SELECT
  USING (true);

-- Refresh job logs: track scheduled job runs
CREATE TABLE public.refresh_job_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  records_processed INTEGER,
  records_failed INTEGER,
  error_message TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_job_logs_name_started
  ON public.refresh_job_logs (job_name, started_at DESC);

GRANT SELECT ON public.refresh_job_logs TO anon;
GRANT SELECT ON public.refresh_job_logs TO authenticated;
GRANT ALL ON public.refresh_job_logs TO service_role;

ALTER TABLE public.refresh_job_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read refresh job logs"
  ON public.refresh_job_logs FOR SELECT
  USING (true);

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_index_constituents_updated_at
  BEFORE UPDATE ON public.index_constituents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_snapshots_updated_at
  BEFORE UPDATE ON public.stock_daily_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_refresh_job_logs_updated_at
  BEFORE UPDATE ON public.refresh_job_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
