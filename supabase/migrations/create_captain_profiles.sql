-- Create captain profiles table for user management
CREATE TABLE IF NOT EXISTS captain_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'internal', -- 'internal', 'external_captain', 'yacht_crew', 'expert'
  commission_rate DECIMAL(5,2) DEFAULT 0.00, -- e.g., 5.00 for 5%
  bank_info JSONB, -- For future payouts
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create content_bookings table to track which content was used in bookings
CREATE TABLE IF NOT EXISTS content_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  knowledge_id TEXT, -- Neo4j knowledge node id
  poi_id TEXT, -- Neo4j POI node id (if contributed POI was booked)
  booking_id TEXT, -- From your booking system
  booking_value DECIMAL(10,2),
  commission_amount DECIMAL(10,2),
  commission_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_captain_profiles_user_id ON captain_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_content_bookings_booking_id ON content_bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_content_bookings_unpaid ON content_bookings(commission_paid) WHERE commission_paid = FALSE;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for captain_profiles
CREATE TRIGGER update_captain_profiles_updated_at
    BEFORE UPDATE ON captain_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE captain_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for captain_profiles
-- Captains can read their own profile
CREATE POLICY "Captains can read own profile"
  ON captain_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Captains can update their own profile (limited fields)
CREATE POLICY "Captains can update own profile"
  ON captain_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can do everything (you'll need to implement admin role check)
-- For now, we'll allow service role full access

-- RLS Policies for content_bookings
-- Captains can read their own commissions
CREATE POLICY "Captains can read own commissions"
  ON content_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM captain_profiles
      WHERE captain_profiles.user_id = auth.uid()
    )
  );

