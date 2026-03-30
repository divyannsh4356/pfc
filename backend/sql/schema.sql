-- Users (teams + admin)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  team_name VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'team')),
  cash_balance NUMERIC(15,2) NOT NULL DEFAULT 0
);

-- Tradeable assets
CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('stock', 'commodity', 'crypto', 'forex')),
  current_price NUMERIC(15,4) NOT NULL
);

-- Price history per round (round 0 = starting anchor)
CREATE TABLE asset_price_history (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER REFERENCES assets(id),
  round_number INTEGER NOT NULL,
  price NUMERIC(15,4) NOT NULL,
  news_impact_pct NUMERIC(8,4),
  market_impact_pct NUMERIC(8,4),
  UNIQUE(asset_id, round_number)
);

-- Competition rounds
CREATE TABLE rounds (
  id SERIAL PRIMARY KEY,
  round_number INTEGER UNIQUE NOT NULL CHECK (round_number BETWEEN 1 AND 6),
  status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'closed')),
  timer_duration_seconds INTEGER NOT NULL DEFAULT 300,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- News per round
CREATE TABLE news (
  id SERIAL PRIMARY KEY,
  round_id INTEGER UNIQUE REFERENCES rounds(id),
  headline TEXT NOT NULL,
  body TEXT NOT NULL
);

-- Hidden per-asset price impact for each round's news
CREATE TABLE news_impact (
  id SERIAL PRIMARY KEY,
  news_id INTEGER REFERENCES news(id),
  asset_id INTEGER REFERENCES assets(id),
  impact_percentage NUMERIC(8,4) NOT NULL,
  UNIQUE(news_id, asset_id)
);

-- Orders placed by teams during a round
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES users(id),
  asset_id INTEGER REFERENCES assets(id),
  round_id INTEGER REFERENCES rounds(id),
  side VARCHAR(4) NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity NUMERIC(15,4) NOT NULL CHECK (quantity > 0),
  fill_price NUMERIC(15,4),
  status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Holdings per team per asset
CREATE TABLE holdings (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES users(id),
  asset_id INTEGER REFERENCES assets(id),
  quantity NUMERIC(15,4) NOT NULL DEFAULT 0,
  UNIQUE(team_id, asset_id)
);
