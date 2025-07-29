import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Calendar, Users, Play, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Tournament {
  id: string;
  name: string;
  created_at: string;
  completed_at: string | null;
  player_count: number;
  rounds_count: number;
}

interface TournamentListProps {
  onBack: () => void;
  onSelectTournament: (tournamentId: string) => void;
  currentTournamentId: string | null;
  onContinueTournament: (tournamentId: string) => void;
  onDeleteTournament?: (tournamentId: string) => void;
}

export const TournamentList = ({ onBack, onSelectTournament, currentTournamentId, onContinueTournament, onDeleteTournament }: TournamentListProps) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setLoading(true);

      // Lade Turniere mit separaten Abfragen für Counts
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (tournamentsError) throw tournamentsError;

      // Lade Spieler- und Runden-Counts für jedes Turnier
      const tournamentsWithCounts = await Promise.all(
        (tournamentsData || []).map(async (tournament) => {
          const [playersResult, roundsResult] = await Promise.all([
            supabase
              .from('tournament_players')
              .select('id', { count: 'exact' })
              .eq('tournament_id', tournament.id),
            supabase
              .from('rounds')
              .select('id', { count: 'exact' })
              .eq('tournament_id', tournament.id)
          ]);

          return {
            id: tournament.id,
            name: tournament.name,
            created_at: tournament.created_at,
            completed_at: tournament.completed_at,
            player_count: playersResult.count || 0,
            rounds_count: roundsResult.count || 0
          };
        })
      );

      setTournaments(tournamentsWithCounts);
    } catch (error) {
      console.error('Fehler beim Laden der Turniere:', error);
      toast({
        title: "Fehler",
        description: "Turniere konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTournament = async (tournamentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!onDeleteTournament) return;
    
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return;
    
    const confirmed = window.confirm(
      `Sind Sie sicher, dass Sie das Turnier "${tournament.name}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`
    );
    
    if (!confirmed) return;
    
    try {
      // Hole zuerst alle Runden-IDs für dieses Turnier
      const { data: rounds } = await supabase
        .from('rounds')
        .select('id')
        .eq('tournament_id', tournamentId);
      
      if (rounds && rounds.length > 0) {
        const roundIds = rounds.map(r => r.id);
        // Lösche alle round_results für diese Runden
        await supabase
          .from('round_results')
          .delete()
          .in('round_id', roundIds);
      }
      
      // Lösche alle zugehörigen Daten in der richtigen Reihenfolge
      const { error: roundsError } = await supabase.from('rounds').delete().eq('tournament_id', tournamentId);
      if (roundsError) throw roundsError;
      
      const { error: playersError } = await supabase.from('tournament_players').delete().eq('tournament_id', tournamentId);
      if (playersError) throw playersError;
      
      const { error: tournamentError } = await supabase.from('tournaments').delete().eq('id', tournamentId);
      if (tournamentError) throw tournamentError;
      
      toast({
        title: "Erfolgreich gelöscht",
        description: `Turnier "${tournament.name}" wurde gelöscht.`,
      });
      
      // Aktualisiere die Liste
      await loadTournaments();
      onDeleteTournament(tournamentId);
    } catch (error) {
      console.error('Fehler beim Löschen des Turniers:', error);
      toast({
        title: "Fehler",
        description: "Turnier konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Lade Turniere...</p>
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
              Turniere verwalten
            </h1>
            <p className="text-muted-foreground text-lg">Übersicht aller vergangenen und laufenden Turniere</p>
          </div>
        </div>

        {/* Current Tournament Indicator */}
        {currentTournamentId && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                <span className="font-medium">Ein Turnier ist gerade aktiv!</span>
                <Badge variant="default" className="ml-auto">Laufend</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tournaments List */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Alle Turniere ({tournaments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tournaments.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Noch keine Turniere</h3>
                <p className="text-muted-foreground">Starten Sie Ihr erstes Turnier!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tournaments.map((tournament) => (
                  <div 
                    key={tournament.id} 
                    className={`
                      border rounded-lg p-4 hover:bg-accent/5 transition-colors cursor-pointer
                      ${tournament.id === currentTournamentId ? 'border-primary/50 bg-primary/5' : ''}
                    `}
                    onClick={() => onSelectTournament(tournament.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{tournament.name}</h3>
                          <Badge variant={tournament.completed_at ? "outline" : "default"}>
                            {tournament.completed_at ? "Abgeschlossen" : "Laufend"}
                          </Badge>
                          {tournament.id === currentTournamentId && (
                            <Badge variant="secondary">Aktiv</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(tournament.created_at).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {tournament.player_count} Spieler
                          </span>
                          <span>{tournament.rounds_count} Runden</span>
                          {tournament.completed_at && (
                            <span>
                              Beendet: {new Date(tournament.completed_at).toLocaleDateString('de-DE')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTournament(tournament.id);
                          }}
                        >
                          Details anzeigen
                        </Button>
                        {!tournament.completed_at && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onContinueTournament(tournament.id);
                            }}
                          >
                            Fortsetzen
                          </Button>
                        )}
                        {onDeleteTournament && tournament.id !== currentTournamentId && (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={(e) => handleDeleteTournament(tournament.id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};