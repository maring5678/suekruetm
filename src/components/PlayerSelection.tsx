import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Play, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PlayerManagement } from "./PlayerManagement";

interface Player {
  id: string;
  name: string;
}

interface PlayerSelectionProps {
  onStartTournament: (selectedPlayers: Player[]) => void;
}

export const PlayerSelection = ({ onStartTournament }: PlayerSelectionProps) => {
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManagement, setShowManagement] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPlayers();
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
    if (selectedPlayers.length >= 3) {
      onStartTournament(selectedPlayers);
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-between items-start mb-4">
              <div></div>
              <Button 
                onClick={() => setShowManagement(true)} 
                variant="outline" 
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Spieler verwalten
              </Button>
            </div>
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Spielerauswahl
            </CardTitle>
            <p className="text-muted-foreground">
              Wählen Sie die Spieler aus, die am heutigen Turnier teilnehmen
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {availablePlayers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Noch keine Spieler vorhanden.
                </p>
                <Button onClick={() => setShowManagement(true)} variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Erste Spieler hinzufügen
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {availablePlayers.map((player) => (
                    <Button
                      key={player.id}
                      variant={isSelected(player.id) ? "default" : "outline"}
                      className="h-auto p-4 text-left justify-start"
                      onClick={() => togglePlayer(player)}
                    >
                      {player.name}
                    </Button>
                  ))}
                </div>

                {selectedPlayers.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">
                      Ausgewählte Spieler ({selectedPlayers.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPlayers.map((player) => (
                        <Badge key={player.id} variant="secondary" className="text-sm">
                          {player.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-center pt-4">
                  <Button
                    onClick={handleStartTournament}
                    disabled={selectedPlayers.length < 3}
                    className="px-8 py-3 text-lg"
                    size="lg"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Turnier starten
                    {selectedPlayers.length < 3 && (
                      <span className="ml-2 text-sm opacity-75">
                        (min. 3 Spieler)
                      </span>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};