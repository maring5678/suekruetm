import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Clock, Trophy, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Tournament {
  id: string;
  name: string;
  created_at: string;
  completed_at: string | null;
  player_count: number;
  round_count: number;
  latest_round: number;
}

interface TournamentOverviewProps {
  onBack: () => void;
  onJoinTournament: (tournamentId: string) => void;
}

export const TournamentOverview = ({ onBack, onJoinTournament }: TournamentOverviewProps) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setLoading(true);

      // Lade alle Turniere mit Spieler- und Rundenzahl
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select(`
          id,
          name,
          created_at,
          completed_at,
          tournament_players!inner(id),
          rounds!inner(id, round_number)
        `)
        .order('created_at', { ascending: false });

      if (tournamentsError) throw tournamentsError;

      // Verarbeite die Daten
      const processedTournaments: Tournament[] = tournamentsData?.map(tournament => ({
        id: tournament.id,
        name: tournament.name,
        created_at: tournament.created_at,
        completed_at: tournament.completed_at,
        player_count: tournament.tournament_players?.length || 0,
        round_count: tournament.rounds?.length || 0,
        latest_round: tournament.rounds?.length > 0 
          ? Math.max(...tournament.rounds.map(r => r.round_number))
          : 0
      })) || [];

      setTournaments(processedTournaments);

    } catch (error) {
      console.error('Fehler beim Laden der Turniere:', error);
      toast({
        title: "Fehler",
        description: "Turniere konnten nicht geladen werden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const activeTournaments = tournaments.filter(t => !t.completed_at);
  const completedTournaments = tournaments.filter(t => t.completed_at);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
            <h1 className="text-3xl font-bold">Turnierübersicht</h1>
          </div>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Lade Turniere...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={onBack} variant="outline" size="sm" className="shadow-sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Turnierübersicht
            </h1>
            <p className="text-muted-foreground text-lg">Laufende und abgeschlossene Turniere</p>
          </div>
        </div>

        {/* Aktive Turniere */}
        {activeTournaments.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Clock className="h-5 w-5 text-warning" />
                Laufende Turniere ({activeTournaments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeTournaments.map((tournament) => (
                  <Card 
                    key={tournament.id} 
                    className="border-2 border-warning/30 hover:border-warning/50 transition-all duration-200 hover:shadow-lg cursor-pointer"
                    onClick={() => onJoinTournament(tournament.id)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg">{tournament.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(tournament.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{tournament.player_count} Spieler</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Trophy className="h-4 w-4" />
                            <span>{tournament.round_count} Runden</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="border-warning text-warning">
                            <Clock className="h-3 w-3 mr-1" />
                            Laufend
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Play className="h-4 w-4 mr-1" />
                            Beitreten
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Abgeschlossene Turniere */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Trophy className="h-5 w-5 text-success" />
              Abgeschlossene Turniere ({completedTournaments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedTournaments.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  Noch keine abgeschlossenen Turniere
                </p>
                <p className="text-sm text-muted-foreground">
                  Beende dein erstes Turnier, um es hier zu sehen
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedTournaments.map((tournament) => (
                  <div 
                    key={tournament.id} 
                    className="flex items-center justify-between border rounded-lg p-4 hover:bg-accent/5 transition-colors"
                  >
                    <div>
                      <h3 className="font-semibold">{tournament.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{new Date(tournament.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {tournament.player_count} Spieler
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          {tournament.round_count} Runden
                        </span>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-success text-success-foreground">
                      Abgeschlossen
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {tournaments.length === 0 && (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-semibold mb-4">Noch keine Turniere</h3>
              <p className="text-muted-foreground">
                Erstelle dein erstes Turnier, um loszulegen
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};