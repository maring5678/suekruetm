import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit, Plus, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Player {
  id: string;
  name: string;
}

interface PlayerManagementProps {
  onClose: () => void;
}

export const PlayerManagement = ({ onClose }: PlayerManagementProps) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [editingPlayer, setEditingPlayer] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
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
      setPlayers(data || []);
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

  const addPlayer = async () => {
    if (!newPlayerName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('players')
        .insert({ name: newPlayerName.trim() })
        .select()
        .single();

      if (error) throw error;

      setPlayers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewPlayerName("");
      
      toast({
        title: "Spieler hinzugefügt",
        description: `${data.name} wurde erfolgreich hinzugefügt.`
      });
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Spielers:', error);
      toast({
        title: "Fehler",
        description: "Spieler konnte nicht hinzugefügt werden.",
        variant: "destructive"
      });
    }
  };

  const updatePlayer = async () => {
    if (!editingPlayer || !editingPlayer.name.trim()) return;

    try {
      const { error } = await supabase
        .from('players')
        .update({ name: editingPlayer.name.trim() })
        .eq('id', editingPlayer.id);

      if (error) throw error;

      setPlayers(prev => 
        prev.map(player => 
          player.id === editingPlayer.id 
            ? { ...player, name: editingPlayer.name.trim() }
            : player
        ).sort((a, b) => a.name.localeCompare(b.name))
      );
      
      setEditingPlayer(null);
      
      toast({
        title: "Spieler aktualisiert",
        description: "Der Spielername wurde erfolgreich geändert."
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Spielers:', error);
      toast({
        title: "Fehler",
        description: "Spieler konnte nicht aktualisiert werden.",
        variant: "destructive"
      });
    }
  };

  const deletePlayer = async (playerId: string, playerName: string) => {
    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      if (error) throw error;

      setPlayers(prev => prev.filter(player => player.id !== playerId));
      
      toast({
        title: "Spieler gelöscht",
        description: `${playerName} wurde erfolgreich gelöscht.`
      });
    } catch (error) {
      console.error('Fehler beim Löschen des Spielers:', error);
      toast({
        title: "Fehler",
        description: "Spieler konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Lade Spieler...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold">Spielerverwaltung</CardTitle>
              <Button onClick={onClose} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Schließen
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Neuen Spieler hinzufügen */}
            <div className="flex gap-2">
              <Input
                placeholder="Name des neuen Spielers"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
              />
              <Button onClick={addPlayer} disabled={!newPlayerName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Hinzufügen
              </Button>
            </div>

            {/* Spielerliste */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Alle Spieler ({players.length})</h3>
              {players.length === 0 ? (
                <p className="text-muted-foreground">Noch keine Spieler vorhanden.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {players.map((player) => (
                    <div key={player.id} className="flex items-center gap-2 p-3 border rounded-lg">
                      {editingPlayer?.id === player.id ? (
                        <>
                          <Input
                            value={editingPlayer.name}
                            onChange={(e) => 
                              setEditingPlayer({ ...editingPlayer, name: e.target.value })
                            }
                            onKeyPress={(e) => e.key === 'Enter' && updatePlayer()}
                            className="flex-1"
                          />
                          <Button onClick={updatePlayer} size="sm" variant="default">
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button 
                            onClick={() => setEditingPlayer(null)} 
                            size="sm" 
                            variant="outline"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-medium">{player.name}</span>
                          <Button
                            onClick={() => setEditingPlayer({ id: player.id, name: player.name })}
                            size="sm"
                            variant="outline"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => deletePlayer(player.id, player.name)}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};