import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Play, Settings, BarChart3, Star, Trophy, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PlayerManagement } from "./PlayerManagement";
import { LiveTicker } from "./LiveTicker";

interface Player {
  id: string;
  name: string;
  isFavorite?: boolean;
}

interface PlayerSelectionProps {
  onPlayersSelected: (players: Player[]) => void;
  onShowStatistics: () => void;
  onShowExcelImport: () => void;
  onTournamentOverview: () => void;
  onJoinTournament: (tournamentId: string) => void;
  isCurrentTournament: boolean;
  currentTournamentId: string | null;
  onBack?: () => void;
  onShowLiveRanking?: () => void;
}

export const PlayerSelection = ({ 
  onPlayersSelected, 
  onShowStatistics, 
  onShowExcelImport, 
  onTournamentOverview,
  onJoinTournament,
  isCurrentTournament,
  currentTournamentId,
  onBack,
  onShowLiveRanking
}: PlayerSelectionProps) => {
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManagement, setShowManagement] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPlayers();
    loadFavorites();
  }, []);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name');

      if (error) throw error;
      setAvailablePlayers(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Spieler:', error);
      toast({
        title: "Fehler",
        description: "Spieler konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('player_favorites')
        .select('player_id');

      if (error) throw error;
      setFavorites(data?.map(f => f.player_id) || []);
    } catch (error) {
      console.error('Fehler beim Laden der Favoriten:', error);
    }
  };

  const toggleFavorite = async (playerId: string) => {
    try {
      const isFavorite = favorites.includes(playerId);
      
      if (isFavorite) {
        await supabase
          .from('player_favorites')
          .delete()
          .eq('player_id', playerId);
        setFavorites(prev => prev.filter(id => id !== playerId));
      } else {
        await supabase
          .from('player_favorites')
          .insert({ player_id: playerId });
        setFavorites(prev => [...prev, playerId]);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Favoriten:', error);
      toast({
        title: "Fehler",
        description: "Favorit konnte nicht aktualisiert werden.",
        variant: "destructive"
      });
    }
  };

  const togglePlayer = (player: Player) => {
    setSelectedPlayers(prev => 
      prev.find(p => p.id === player.id)
        ? prev.filter(p => p.id !== player.id)
        : [...prev, player]
    );
  };

  const isSelected = (playerId: string) => 
    selectedPlayers.some(p => p.id === playerId);

  const handleStartTournament = () => {
    if (selectedPlayers.length >= 2) {
      onPlayersSelected(selectedPlayers);
    }
  };

  if (showManagement) {
    return (
      <PlayerManagement 
        onClose={() => {
          setShowManagement(false);
          loadPlayers();
        }} 
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Lade Spieler...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-20"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl opacity-30"></div>
      
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Live Ticker */}
        <LiveTicker 
          onJoinTournament={onJoinTournament}
          currentTournamentId={currentTournamentId}
        />

        {/* Header */}
        <div className="text-center mb-12">
          <div className="absolute top-6 left-6">
            {onBack && (
              <Button 
                onClick={onBack} 
                variant="outline" 
                size="sm"
                className="backdrop-blur-sm bg-card/50 hover:bg-card/80 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück
              </Button>
            )}
          </div>
          
          <div className="absolute top-6 right-6">
            <Button 
              onClick={() => setShowManagement(true)} 
              variant="outline" 
              size="sm"
              className="backdrop-blur-sm bg-card/50 hover:bg-card/80 transition-all duration-300"
            >
              <Settings className="h-4 w-4 mr-2" />
              Spieler verwalten
            </Button>
          </div>
          
          <div className="inline-flex items-center gap-3 p-4 rounded-full bg-primary/10 mb-6">
            <Users className="h-8 w-8 text-primary" />
          </div>
          
          <h1 className="text-5xl font-bold mb-4 gradient-text">
            Tournament Manager
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Wählen Sie die Spieler aus, die am heutigen Turnier teilnehmen werden
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {availablePlayers.length === 0 ? (
            <Card className="card-elevated max-w-md mx-auto text-center">
              <CardContent className="p-12">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Noch keine Spieler vorhanden</h3>
                <p className="text-muted-foreground mb-6">
                  Fügen Sie Ihre ersten Spieler hinzu, um zu beginnen
                </p>
                <Button 
                  onClick={() => setShowManagement(true)} 
                  className="button-glow"
                  size="lg"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Erste Spieler hinzufügen
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Player Grid */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="text-2xl">Verfügbare Spieler</CardTitle>
                  <p className="text-muted-foreground">
                    Klicken Sie auf die Spieler, die teilnehmen sollen
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {[
                      // Favoriten zuerst
                      ...availablePlayers
                        .filter(player => favorites.includes(player.id))
                        .sort((a, b) => a.name.localeCompare(b.name)),
                      // Dann die restlichen Spieler
                      ...availablePlayers
                        .filter(player => !favorites.includes(player.id))
                        .sort((a, b) => a.name.localeCompare(b.name))
                    ].map((player) => (
                      <div key={player.id} className="relative">
                        <Button
                          variant={isSelected(player.id) ? "default" : "outline"}
                          className={`
                            h-auto p-6 text-left justify-center transition-all duration-300 transform hover:scale-105 w-full
                            ${isSelected(player.id) 
                              ? "button-glow bg-primary text-primary-foreground" 
                              : "hover:bg-primary/5 hover:border-primary/30"
                            }
                            ${favorites.includes(player.id) ? "border-2 border-warning/50" : ""}
                          `}
                          onClick={() => togglePlayer(player)}
                        >
                          <div className="text-center">
                            <div className={`
                              w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center font-bold text-lg
                              ${isSelected(player.id) 
                                ? "bg-primary-foreground/20 text-primary-foreground" 
                                : "bg-primary/10 text-primary"
                              }
                            `}>
                              {player.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{player.name}</span>
                          </div>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-1 right-1 w-6 h-6 p-0 hover:bg-warning/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(player.id);
                          }}
                        >
                          <Star 
                            className={`h-3 w-3 ${
                              favorites.includes(player.id) 
                                ? "fill-warning text-warning" 
                                : "text-muted-foreground hover:text-warning"
                            }`} 
                          />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Selected Players */}
              {selectedPlayers.length > 0 && (
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Ausgewählte Spieler ({selectedPlayers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {selectedPlayers.map((player) => (
                        <Badge 
                          key={player.id} 
                          variant="secondary" 
                          className="text-base px-4 py-2 bg-primary/10 text-primary border border-primary/20"
                        >
                          {player.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="grid md:grid-cols-4 gap-6 max-w-8xl mx-auto">
                <Card className="card-elevated overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group" onClick={onShowStatistics}>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-info/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <BarChart3 className="h-8 w-8 text-info" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Statistiken anzeigen</h3>
                    <p className="text-muted-foreground mb-4">
                      Detaillierte Auswertungen aller Turniere
                    </p>
                    <Button variant="outline" className="w-full group-hover:bg-info/10">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Statistiken öffnen
                    </Button>
                  </CardContent>
                </Card>

                <Card className="card-elevated overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group" onClick={onTournamentOverview}>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Trophy className="h-8 w-8 text-secondary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Turniere verwalten</h3>
                    <p className="text-muted-foreground mb-4">
                      Vergangene und laufende Turniere anzeigen
                    </p>
                    <Button variant="outline" className="w-full group-hover:bg-secondary/10">
                      <Trophy className="h-4 w-4 mr-2" />
                      Turniere öffnen
                    </Button>
                  </CardContent>
                </Card>

                {onShowLiveRanking && (
                  <Card className="card-elevated overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group" onClick={onShowLiveRanking}>
                    <CardContent className="p-8 text-center">
                      <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Trophy className="h-8 w-8 text-green-500" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Live Rankings</h3>
                      <p className="text-muted-foreground mb-4">
                        Echtzeit-Ranglisten aller Turniere
                      </p>
                      <Button variant="outline" className="w-full group-hover:bg-green-500/10">
                        <Trophy className="h-4 w-4 mr-2" />
                        Live Rankings
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card className={`
                  card-elevated overflow-hidden transition-all duration-300 cursor-pointer group
                  ${selectedPlayers.length >= 2 
                    ? "hover:shadow-xl border-primary/30" 
                    : "opacity-60 cursor-not-allowed"
                  }
                `}>
                  <CardContent className="p-8 text-center">
                    <div className={`
                      w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-all
                      ${selectedPlayers.length >= 2 
                        ? "bg-primary/10 group-hover:scale-110" 
                        : "bg-muted/50"
                      }
                    `}>
                      <Play className={`h-8 w-8 ${selectedPlayers.length >= 2 ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Turnier starten</h3>
                    <p className="text-muted-foreground mb-4">
                      {selectedPlayers.length >= 2 
                        ? "Beginnen Sie ein neues Turnier" 
                        : "Mindestens 2 Spieler erforderlich"
                      }
                    </p>
                    <Button
                      onClick={handleStartTournament}
                      disabled={selectedPlayers.length < 2}
                      className={`
                        w-full button-glow transition-all duration-300
                        ${selectedPlayers.length >= 2 ? "hover:scale-105" : ""}
                      `}
                      size="lg"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Turnier starten
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};