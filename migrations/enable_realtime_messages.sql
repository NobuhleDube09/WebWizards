-- Enable Supabase Realtime for the messages table.
-- Run this once in the Supabase SQL editor (or via psql).
alter publication supabase_realtime add table messages;
