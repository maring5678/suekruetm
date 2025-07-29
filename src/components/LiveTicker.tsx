import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Timer, Play, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LiveTournament {
  id: string;
  name: string;
  created_at: string;
  player_count: number;
  current_round: number;
  latest_activity: string;
}

interface LiveTickerProps {
  onJoinTournament: (tournamentId: string) => void;
  currentTournamentId: string | null;
}

export const LiveTicker = ({ onJoinTournament, currentTournamentId }: LiveTickerProps) => {
  const [liveTournaments, setLiveTournaments] = useState<LiveTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLiveTournaments();
    
    // Aktualisiere alle 30 Sekunden
    const interval = setInterval(loadLiveTournaments, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadLiveTournaments = async () => {
    try {
      // Lade laufende Turniere (nicht abgeschlossen)
      const { data: tournaments, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('*')
        .is('completed_at', null)
        .order('created_at', { ascending: false })
        .limit(3);

      if (tournamentsError) throw tournamentsError;

      if (!tournaments || tournaments.length === 0) {
        setLiveTournaments([]);
        setLoading(false);
        return;
      }

      // Lade Details für jedes Turnier
      const tournamentsWithDetails = await Promise.all(
        tournaments.map(async (tournament) => {
          const [playersResult, roundsResult] = await Promise.all([
            supabase
              .from('tournament_players')
              .select('id', { count: 'exact' })
              .eq('tournament_id', tournament.id),
            supabase
              .from('rounds')
              .select('round_number, created_at')
              .eq('tournament_id', tournament.id)
              .order('round_number', { ascending: false })
              .limit(1)
          ]);

          const latestRound = roundsResult.data?.[0];
          
          return {
            id: tournament.id,
            name: tournament.name,
            created_at: tournament.created_at,
            player_count: playersResult.count || 0,
            current_round: latestRound?.round_number || 0,
            latest_activity: latestRound?.created_at || tournament.created_at
          };
        })
      );

      setLiveTournaments(tournamentsWithDetails);
    } catch (error) {
      console.error('Fehler beim Laden der Live-Turniere:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm">Lade Live-Turniere...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (liveTournaments.length === 0) {
    return (
      <Card className="border-muted bg-muted/20">
        <CardContent className="p-4 text-center">
          <Timer className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Keine laufenden Turniere</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <Trophy className="h-5 w-5 text-primary" />
            Live Turniere
          </div>
          <Badge variant="secondary" className="ml-auto">
            {liveTournaments.length} aktiv
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {liveTournaments.map((tournament) => (
          <div 
            key={tournament.id}
            className={`
              p-3 rounded-lg border-2 transition-all
              ${tournament.id === currentTournamentId 
                ? 'border-primary bg-primary/10' 
                : 'border-border bg-background/50'
              }
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{tournament.name}</h4>
                {tournament.id === currentTournamentId && (
                  <Badge variant="default" className="text-xs">Du spielst</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Play className="h-3 w-3" />
                Runde {tournament.current_round}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {tournament.player_count} Spieler
                </span>
                <span>
                  Letzte Aktivität: {new Date(tournament.latest_activity).toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              {tournament.id !== currentTournamentId && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-xs"
                  onClick={() => onJoinTournament(tournament.id)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Ansehen
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};