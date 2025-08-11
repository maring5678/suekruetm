import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, MapPin, Plus, Users, Check, UserMinus, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Player {
  id: string;
  name: string;
}

interface RoundInputProps {
  roundNumber: number;
  players: Player[];
  onRoundComplete: (creator: string, trackNumber: string, trackName: string, rankings: Player[]) => void;
  onPlayersChange: (players: Player[]) => void;
  onBack?: () => void;
}

export const RoundInput = ({ roundNumber, players, onRoundComplete, onPlayersChange, onBack }: RoundInputProps) => {
  const [creator, setCreator] = useState("");
  const [trackNumber, setTrackNumber] = useState("");
  const [previousCreators, setPreviousCreators] = useState<string[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [tempSelectedPlayers, setTempSelectedPlayers] = useState<Player[]>(players);
  const [loading, setLoading] = useState(true);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);
  const [isCustomCreator, setIsCustomCreator] = useState(false);
  const [customCreator, setCustomCreator] = useState("");
  const [showRanking, setShowRanking] = useState(false);
  const [selectedRankings, setSelectedRankings] = useState<Player[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadPreviousCreators();
    loadAvailablePlayers();
  }, []);

  useEffect(() => {
    setTempSelectedPlayers(players);
  }, [players]);

  const loadPreviousCreators = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rounds')
        .select('creator')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Einzigartige Creator extrahieren
      const uniqueCreators = Array.from(new Set(data?.map(round => round.creator) || []));
      setPreviousCreators(uniqueCreators);
      
      // Wenn keine vorherigen Ersteller vorhanden sind, automatisch Custom-Modus aktivieren
      setIsCustomCreator(uniqueCreators.length === 0);
    } catch (error) {
      console.error('Fehler beim Laden der Ersteller:', error);
      toast({
        title: "Warnung",
        description: "Vorherige Ersteller konnten nicht geladen werden.",
        variant: "destructive"
      });
      setIsCustomCreator(true);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSubmit = () => {
    const finalCreator = isCustomCreator ? customCreator : creator;
    if (finalCreator.trim() && trackNumber.trim()) {
      setShowRanking(true);
    }
  };

  const loadAvailablePlayers = async () => {
    try {
      setPlayersLoading(true);
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
      setPlayersLoading(false);
    }
  };

  const togglePlayer = (player: Player) => {
    setTempSelectedPlayers(prev => 
      prev.find(p => p.id === player.id)
        ? prev.filter(p => p.id !== player.id)
        : [...prev, player]
    );
  };

  const isPlayerSelected = (playerId: string) => 
    tempSelectedPlayers.some(p => p.id === playerId);

  const handleSavePlayerChanges = () => {
    if (tempSelectedPlayers.length >= 2) {
      onPlayersChange(tempSelectedPlayers);
      setShowPlayerDialog(false);
      toast({
        title: "Teilnehmer aktualisiert",
        description: `${tempSelectedPlayers.length} Spieler für Runde ${roundNumber} ausgewählt.`
      });
    }
  };

  const handleCancelPlayerEdit = () => {
    setTempSelectedPlayers(players);
    setShowPlayerDialog(false);
  };
  const selectPlayerForRanking = (player: Player, position: number) => {
    const newRankings = [...selectedRankings];
    newRankings[position - 1] = player;
    setSelectedRankings(newRankings);
  };

  const isRankingPlayerSelected = (playerId: string) => 
    selectedRankings.some(p => p?.id === playerId);

  const getAvailablePlayersForPosition = (position: number) => 
    players.filter(player => 
      !isRankingPlayerSelected(player.id) || selectedRankings[position - 1]?.id === player.id
    );

  const handleRoundComplete = () => {
    // Alle Positionen müssen ausgefüllt sein
    const validSelections = selectedRankings.filter(p => p);
    
    if (validSelections.length === players.length) {
      const finalCreator = isCustomCreator ? customCreator : creator;
      const trackName = `${finalCreator} #${trackNumber}`;
      onRoundComplete(finalCreator, trackNumber, trackName, selectedRankings);
    }
  };

  const getPointsForPosition = (position: number, totalPlayers: number) => {
    if (totalPlayers === 2) {
      return position === 1 ? 1 : 0;
    } else if (totalPlayers === 3) {
      return position === 1 ? 2 : position === 2 ? 1 : 0;
    } else {
      return position === 1 ? 3 : position === 2 ? 2 : position === 3 ? 1 : 0;
    }
  };

  const getRankingBadgeVariant = (position: number) => {
    switch (position) {
      case 1: return "default";
      case 2: return "secondary"; 
      case 3: return "outline";
      default: return "outline";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Lade Ersteller...</p>
        </div>
      </div>
    );
  }

  if (!showRanking) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          {onBack && (
            <div className="mb-6">
              <Button onClick={onBack} variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück
              </Button>
            </div>
          )}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <MapPin className="h-6 w-6 text-primary" />
                Runde {roundNumber}
              </CardTitle>
              <p className="text-muted-foreground">
                Geben Sie den Ersteller und die Streckennummer ein
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ersteller</Label>
                  {previousCreators.length > 0 && !isCustomCreator ? (
                    <div className="space-y-2">
                      <Select value={creator} onValueChange={setCreator}>
                        <SelectTrigger>
                          <SelectValue placeholder="Ersteller auswählen..." />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border z-50">
                          {previousCreators.map((prevCreator) => (
                            <SelectItem key={prevCreator} value={prevCreator}>
                              {prevCreator}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCustomCreator(true)}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Neuen Ersteller hinzufügen
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        value={customCreator}
                        onChange={(e) => setCustomCreator(e.target.value)}
                        placeholder="Ersteller eingeben..."
                        className="text-lg"
                      />
                      {previousCreators.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsCustomCreator(false);
                            setCustomCreator("");
                          }}
                          className="w-full"
                        >
                          Aus Liste auswählen
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trackNumber">Streckennummer</Label>
                  <Input
                    id="trackNumber"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={trackNumber}
                    onChange={(e) => setTrackNumber(e.target.value)}
                    placeholder="z.B. 1, 2, 3..."
                    className="text-lg"
                    onKeyPress={(e) => e.key === 'Enter' && handleTrackSubmit()}
                  />
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Teilnehmende Spieler:</h3>
                  <Dialog open={showPlayerDialog} onOpenChange={setShowPlayerDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Users className="h-4 w-4 mr-2" />
                        Bearbeiten
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Teilnehmer für Runde {roundNumber} bearbeiten</DialogTitle>
                        <DialogDescription>
                          Wählen Sie die Spieler aus, die an dieser Runde teilnehmen sollen.
                        </DialogDescription>
                      </DialogHeader>
                      
                      {playersLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                          <p>Lade Spieler...</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                            {availablePlayers.map((player) => (
                              <Button
                                key={player.id}
                                variant={isPlayerSelected(player.id) ? "default" : "outline"}
                                className="h-auto p-3 text-left justify-start"
                                onClick={() => togglePlayer(player)}
                              >
                                {isPlayerSelected(player.id) && <Check className="h-4 w-4 mr-2" />}
                                {player.name}
                              </Button>
                            ))}
                          </div>

                          {tempSelectedPlayers.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium">
                                Ausgewählte Spieler ({tempSelectedPlayers.length})
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {tempSelectedPlayers.map((player) => (
                                  <Badge key={player.id} variant="secondary" className="text-sm">
                                    {player.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end gap-2 pt-4">
                            <Button
                              onClick={handleCancelPlayerEdit}
                              variant="outline"
                            >
                              Abbrechen
                            </Button>
                            <Button
                              onClick={handleSavePlayerChanges}
                              disabled={tempSelectedPlayers.length < 2}
                            >
                              Bestätigen ({tempSelectedPlayers.length} Spieler)
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex flex-wrap gap-2">
                  {players.map((player) => (
                    <Badge key={player.id} variant="outline">
                      {player.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={handleTrackSubmit}
                  disabled={!(isCustomCreator ? customCreator.trim() : creator) || !trackNumber.trim()}
                  size="lg"
                  className="w-full max-w-sm"
                >
                  Weiter zur Platzierung
                </Button>
              </div>
              
              {/* Debug Info entfernt für bessere UX */}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              Runde {roundNumber} - {(isCustomCreator ? customCreator : creator)} #{trackNumber}
            </CardTitle>
            <p className="text-muted-foreground">
              Beginnen Sie mit dem letzten Platz und arbeiten sich nach oben
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {(() => {
                // Zeige alle Positionen von letztem bis ersten Platz
                const positions: number[] = [];
                for (let i = players.length; i >= 1; i--) {
                  positions.push(i);
                }
                return positions;
              })().map((position) => (
                <Card key={position} className="relative">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-center">
                      {position}. Platz
                      <Badge 
                        variant={getRankingBadgeVariant(position)}
                        className="ml-2"
                      >
                        {getPointsForPosition(position, players.length)} {getPointsForPosition(position, players.length) === 1 ? "Punkt" : "Punkte"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {getAvailablePlayersForPosition(position).map((player) => (
                      <Button
                        key={player.id}
                        variant={selectedRankings[position - 1]?.id === player.id ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => selectPlayerForRanking(player, position)}
                      >
                        {player.name}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button
                onClick={() => setShowRanking(false)}
                variant="outline"
                size="lg"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück
              </Button>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    const finalCreator = isCustomCreator ? customCreator : creator;
                    const trackName = `${finalCreator} #${trackNumber}`;
                    onRoundComplete(finalCreator, trackNumber, trackName, []);
                  }}
                  variant="outline"
                  size="lg"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Turnier beenden
                </Button>
                
                <Button
                  onClick={handleRoundComplete}
                  disabled={selectedRankings.filter(p => p).length !== players.length}
                  size="lg"
                  className="px-8"
                >
                  Runde abschließen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};