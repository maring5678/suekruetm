-- Chat-System für Live-Kommunikation erstellen
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id text NOT NULL,
    user_name text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat-Nachrichten sind für alle sichtbar (öffentlicher Chat)
CREATE POLICY "Jeder kann Chat-Nachrichten anzeigen"
ON public.chat_messages
FOR SELECT
USING (true);

-- Jeder kann Chat-Nachrichten erstellen
CREATE POLICY "Jeder kann Chat-Nachrichten erstellen"
ON public.chat_messages
FOR INSERT
WITH CHECK (true);

-- Index für bessere Performance
CREATE INDEX idx_chat_messages_room_created 
ON public.chat_messages(room_id, created_at);

-- Realtime für Live-Chat aktivieren
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;