-- Enable real-time updates for live ranking
ALTER TABLE round_results REPLICA IDENTITY FULL;
ALTER TABLE tournaments REPLICA IDENTITY FULL;
ALTER TABLE rounds REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE round_results;
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;  
ALTER PUBLICATION supabase_realtime ADD TABLE rounds;