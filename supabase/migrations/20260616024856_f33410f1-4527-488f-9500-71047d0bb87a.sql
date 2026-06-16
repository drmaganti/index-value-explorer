CREATE TABLE IF NOT EXISTS public.bootstrap_ticker_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL UNIQUE,
  index_symbols text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  next_retry_at timestamptz,
  trade_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bootstrap_ticker_queue TO anon, authenticated;
GRANT ALL ON public.bootstrap_ticker_queue TO service_role;

ALTER TABLE public.bootstrap_ticker_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bootstrap queue"
  ON public.bootstrap_ticker_queue FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS bootstrap_ticker_queue_status_idx
  ON public.bootstrap_ticker_queue (status, next_retry_at);

CREATE TRIGGER bootstrap_ticker_queue_set_updated_at
  BEFORE UPDATE ON public.bootstrap_ticker_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();