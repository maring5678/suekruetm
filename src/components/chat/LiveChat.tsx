import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Users, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  user_name: string;
  message: string;
  created_at: string;
  room_id: string;
}

interface UserPresence {
  user_name: string;
  online_at: string;
}

interface LiveChatProps {
  roomId: string;
  userName: string;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export const LiveChat = ({ roomId, userName, isMinimized = false, onToggleMinimize }: LiveChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  // Auto-scroll zu neuen Nachrichten
  const scrollToBottom = () => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Überwache Scroll-Position um Auto-Scroll zu steuern
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isNearBottom);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, autoScroll]);

  // Lade bestehende Nachrichten und Setup
  useEffect(() => {
    let chatChannel: any = null;
    let presenceChannel: any = null;

    const setupChat = async () => {
      await loadMessages();
      chatChannel = setupRealtimeSubscription();
      presenceChannel = setupPresenceTracking();
    };

    setupChat();
    
    return () => {
      if (chatChannel) {
        supabase.removeChannel(chatChannel);
      }
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [roomId]);

  const loadMessages = async () => {
    try {
      // Verwende generisches any für chat_messages bis Types aktualisiert werden
      const { data, error } = await (supabase as any)
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setMessages((data as ChatMessage[]) || []);
    } catch (error) {
      console.error('Fehler beim Laden der Nachrichten:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`chat-${roomId}`, {
        config: {
          broadcast: { self: false }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Neue Chat-Nachricht empfangen:', payload);
          const newMessage = payload.new as ChatMessage;
          
          setMessages(current => {
            // Verhindere Duplikate
            if (current.some(msg => msg.id === newMessage.id)) {
              return current;
            }
            return [...current, newMessage];
          });
          
          // Zeige Toast für neue Nachrichten von anderen Benutzern
          if (newMessage.user_name !== userName && isMinimized) {
            toast({
              title: "Neue Nachricht",
              description: `${newMessage.user_name}: ${newMessage.message.substring(0, 50)}${newMessage.message.length > 50 ? '...' : ''}`,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Chat Realtime Status:', status);
      });

    return channel;
  };

  const setupPresenceTracking = () => {
    const presenceChannel = supabase.channel(`presence-${roomId}`, {
      config: {
        presence: {
          key: userName,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = presenceChannel.presenceState();
        const users = Object.keys(presenceState).map(key => ({
          user_name: key,
          online_at: new Date().toISOString()
        }));
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Benutzer beigetreten:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Benutzer verlassen:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_name: userName,
            online_at: new Date().toISOString(),
          });
        }
      });

    return presenceChannel;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading || !profile?.display_name) return;

    setIsLoading(true);
    try {
      // Verwende generisches any für chat_messages bis Types aktualisiert werden
      const { error } = await (supabase as any)
        .from('chat_messages')
        .insert({
          room_id: roomId,
          user_name: profile.display_name,
          message: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gesendet werden",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={onToggleMinimize}
          className="relative"
          size="lg"
        >
          <MessageCircle className="h-5 w-5 mr-2" />
          Chat
          {onlineUsers.length > 1 && (
            <Badge className="ml-2 bg-green-500 text-white">
              {onlineUsers.length}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 z-50">
      <Card className="h-full flex flex-col shadow-lg">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Live Chat
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {onlineUsers.length}
              </Badge>
              <Button
                onClick={onToggleMinimize}
                variant="ghost"
                size="sm"
              >
                {isMinimized ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-3 gap-3">
          {/* Online Benutzer */}
          {onlineUsers.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {onlineUsers.map(user => (
                <Badge 
                  key={user.user_name}
                  variant={user.user_name === userName ? "default" : "secondary"}
                  className="text-xs"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                  {user.user_name}
                </Badge>
              ))}
            </div>
          )}

          {/* Nachrichten */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto space-y-2 min-h-0 max-h-[280px] scroll-smooth"
            onScroll={handleScroll}
            style={{ scrollBehavior: 'smooth' }}
          >
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-4">
                Noch keine Nachrichten. Starte die Unterhaltung!
              </div>
            ) : (
              <>
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`
                      p-2 rounded-lg text-sm break-words
                      ${message.user_name === profile?.display_name
                        ? 'bg-primary text-primary-foreground ml-4' 
                        : 'bg-muted mr-4'
                      }
                    `}
                  >
                    <div className="font-medium text-xs opacity-75">
                      {message.user_name} • {formatTime(message.created_at)}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap">{message.message}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
            
            {/* Scroll to bottom Button */}
            {!autoScroll && (
              <div className="sticky bottom-2 right-2 flex justify-end">
                <Button
                  onClick={() => {
                    setAutoScroll(true);
                    scrollToBottom();
                  }}
                  size="sm"
                  variant="secondary"
                  className="opacity-80 hover:opacity-100"
                >
                  ↓ Neue Nachrichten
                </Button>
              </div>
            )}
          </div>

          {/* Eingabefeld */}
          <div className="flex gap-2 flex-shrink-0">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nachricht eingeben..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage}
              disabled={!newMessage.trim() || isLoading}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};