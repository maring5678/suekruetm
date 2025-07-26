import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, MapPin, Plus } from "lucide-react";

interface Player {
  id: string;
  name: string;
}

interface RoundInputProps {
  roundNumber: number;
  players: Player[];
  previousCreators: string[];
  onRoundComplete: (creator: string, trackNumber: string, trackName: string, rankings: Player[]) => void;
}

export const RoundInput = ({ roundNumber, players, previousCreators, onRoundComplete }: RoundInputProps) => {
  const [creator, setCreator] = useState("");
  const [trackNumber, setTrackNumber] = useState("");
  // Wenn keine vorherigen Ersteller vorhanden sind, automatisch Custom-Modus aktivieren
  const [isCustomCreator, setIsCustomCreator] = useState(previousCreators.length === 0);
  const [customCreator, setCustomCreator] = useState("");
  const [showRanking, setShowRanking] = useState(false);
  const [selectedRankings, setSelectedRankings] = useState<Player[]>([]);

  const handleTrackSubmit = () => {
    const finalCreator = isCustomCreator ? customCreator : creator;
    if (finalCreator.trim() && trackNumber.trim()) {
      setShowRanking(true);
    }
  };

  const selectPlayerForRanking = (player: Player, position: number) => {
    const newRankings = [...selectedRankings];
    newRankings[position - 1] = player;
    setSelectedRankings(newRankings);
  };

  const isPlayerSelected = (playerId: string) => 
    selectedRankings.some(p => p?.id === playerId);

  const getAvailablePlayersForPosition = (position: number) => 
    players.filter(player => 
      !isPlayerSelected(player.id) || selectedRankings[position - 1]?.id === player.id
    );

  const handleRoundComplete = () => {
    if (selectedRankings.length === 3 && selectedRankings.every(p => p)) {
      const finalCreator = isCustomCreator ? customCreator : creator;
      const trackName = `${finalCreator} #${trackNumber}`;
      onRoundComplete(finalCreator, trackNumber, trackName, selectedRankings);
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

  if (!showRanking) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
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
                    value={trackNumber}
                    onChange={(e) => setTrackNumber(e.target.value)}
                    placeholder="z.B. 1, 2, 3..."
                    className="text-lg"
                    onKeyPress={(e) => e.key === 'Enter' && handleTrackSubmit()}
                  />
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Teilnehmende Spieler:</h3>
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
              
              {/* Debug Info */}
              <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                <p>Debug: Creator: "{isCustomCreator ? customCreator : creator}"</p>
                <p>Track Number: "{trackNumber}"</p>
                <p>Is Custom: {isCustomCreator.toString()}</p>
                <p>Button Enabled: {((isCustomCreator ? customCreator.trim() : creator) && trackNumber.trim()).toString()}</p>
              </div>
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
              Wählen Sie die ersten 3 Plätze aus
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((position) => (
                <Card key={position} className="relative">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-center">
                      {position}. Platz
                      <Badge 
                        variant={getRankingBadgeVariant(position)}
                        className="ml-2"
                      >
                        {position === 1 ? "3" : position === 2 ? "2" : "1"} Punkte
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

            <div className="flex justify-center pt-4">
              <Button
                onClick={handleRoundComplete}
                disabled={selectedRankings.length < 3 || !selectedRankings.every(p => p)}
                size="lg"
                className="px-8"
              >
                Runde abschließen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};