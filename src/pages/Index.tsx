import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Loader2 } from "lucide-react";
import { PlayerSelection } from "@/components/PlayerSelection";
import { PlayerEdit } from "@/components/PlayerEdit";
import { RoundInput } from "@/components/RoundInput";
import { Leaderboard } from "@/components/Leaderboard";
import { TournamentComplete } from "@/components/TournamentComplete";
import { Statistics } from "@/components/Statistics";
import { ExcelImport } from "@/components/ExcelImport";
import { PlayerDetail } from "@/components/PlayerDetail";
import { TournamentOverview } from "@/components/TournamentOverview";
import { LiveRanking } from "@/components/LiveRanking";
import { LiveChat } from "@/components/chat/LiveChat";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Player {
  id: string;
  name: string;
}

interface PlayerScore {
  playerId: string;
  playerName: string;
  totalPoints: number;
  roundScores: number[];
}

interface PlayerScoreOld {
  player: Player;
  totalPoints: number;
  roundResults: {
    round: number;
    track: string;
    position: number;
    points: number;
  }[];
}

type GameState = "player-selection" | "player-edit" | "round-input" | "leaderboard" | "tournament-complete" | "statistics" | "excel-import" | "player-detail" | "tournament-overview" | "live-ranking";

const Index = () => {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const { user, profile, loading, signOut } = useAuth();
  
  // Bestimme gameState basierend auf der URL
  const getGameStateFromUrl = (): GameState => {
    const path = location.pathname;
    if (path === '/statistics') return 'statistics';
    if (path === '/tournaments') return 'tournament-overview';
    if (path === '/live-ranking') return 'live-ranking';
    if (path === '/excel-import') return 'excel-import';
    if (path.startsWith('/player/')) return 'player-detail';
    if (path.startsWith('/tournament/')) {
      // Prüfe ob es ein aktives Turnier ist
      return 'leaderboard'; // Default für Turnier-URLs
    }
    return 'player-selection';
  };

  const [gameState, setGameStateInternal] = useState<GameState>(getGameStateFromUrl());
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [playerScores, setPlayerScores] = useState<{ [key: string]: PlayerScore }>({});
  const [previousCreators, setPreviousCreators] = useState<string[]>([]); // Wird nicht mehr verwendet
  const [currentTournamentId, setCurrentTournamentId] = useState<string | null>(params.tournamentId || null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(params.playerId || null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
  const [chatMinimized, setChatMinimized] = useState(true);
  const { toast } = useToast();

  // Authentifizierung prüfen
  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user, loading, navigate]);

  // URL-basierte Navigation handhaben (separater useEffect)
  useEffect(() => {
    if (loading || !user) return;

    const newGameState = getGameStateFromUrl();
    setGameStateInternal(newGameState);
  }, [location.pathname, loading, user]);

  // Turnier-Parameter handhaben (separater useEffect)
  useEffect(() => {
    if (loading || !user) return;
    
    if (params.tournamentId && params.tournamentId !== currentTournamentId) {
      setCurrentTournamentId(params.tournamentId);
      handleContinueTournament(params.tournamentId);
    }
  }, [params.tournamentId, currentTournamentId, loading, user]);

  // Spieler-Parameter handhaben (separater useEffect)
  useEffect(() => {
    if (loading || !user) return;
    
    if (params.playerId && params.playerId !== selectedPlayerId) {
      setSelectedPlayerId(params.playerId);
    }
  }, [params.playerId, selectedPlayerId, loading, user]);

  // Navigation mit URL-Update
  const setGameState = (newState: GameState, params?: { tournamentId?: string; playerId?: string }) => {
    setGameStateInternal(newState);
    
    switch (newState) {
      case 'statistics':
        navigate('/statistics');
        break;
      case 'tournament-overview':
        navigate('/tournaments');
        break;
      case 'live-ranking':
        navigate('/live-ranking');
        break;
      case 'excel-import':
        navigate('/excel-import');
        break;
      case 'player-detail':
        if (params?.playerId) {
          navigate(`/player/${params.playerId}`);
        }
        break;
      case 'leaderboard':
      case 'round-input':
      case 'tournament-complete':
        if (params?.tournamentId || currentTournamentId) {
          navigate(`/tournament/${params?.tournamentId || currentTournamentId}`);
        }
        break;
      default:
        navigate('/');
        break;
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleStartTournament = async (players: Player[]) => {
    try {
      // Turnier in Supabase erstellen
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({ name: `Turnier ${new Date().toLocaleDateString()}` })
        .select()
        .single();

      if (tournamentError) throw tournamentError;

      // Spieler in Supabase speichern und mit Turnier verknüpfen
      for (const player of players) {
        const { data: existingPlayer } = await supabase
          .from('players')
          .select('id')
          .eq('name', player.name)
          .single();

        let playerId = existingPlayer?.id;

        if (!existingPlayer) {
          const { data: newPlayer, error: playerError } = await supabase
            .from('players')
            .insert({ name: player.name })
            .select()
            .single();

          if (playerError) throw playerError;
          playerId = newPlayer.id;
        }

        await supabase
          .from('tournament_players')
          .insert({ tournament_id: tournament.id, player_id: playerId });
      }

      setCurrentTournamentId(tournament.id);
      setSelectedPlayers(players);
      const initialScores: { [key: string]: PlayerScore } = {};
      players.forEach(player => {
        initialScores[player.id] = {
          playerId: player.id,
          playerName: player.name,
          totalPoints: 0,
          roundScores: []
        };
      });
      setPlayerScores(initialScores);
      setGameState("round-input", { tournamentId: tournament.id });
      
      toast({
        title: "Turnier gestartet",
        description: "Das Turnier wurde erfolgreich in der Datenbank gespeichert."
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Turniers:', error);
      toast({
        title: "Fehler",
        description: "Turnier konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const handleRoundComplete = async (creator: string, trackNumber: string, trackName: string, rankings: Player[]) => {
    if (!currentTournamentId) return;
    
    try {
      // Dynamische Punktevergabe basierend auf Anzahl der Spieler
      let pointsMap: Record<number, number> = {};
      if (selectedPlayers.length === 2) {
        pointsMap = { 1: 1 }; // Nur 1. Platz bekommt 1 Punkt
      } else if (selectedPlayers.length === 3) {
        pointsMap = { 1: 2, 2: 1 }; // 1. Platz: 2 Punkte, 2. Platz: 1 Punkt
      } else {
        pointsMap = { 1: 3, 2: 2, 3: 1 }; // Standard: 3-2-1 Punkte
      }
      
      // Ersteller zur Liste hinzufügen wenn noch nicht vorhanden
      if (!previousCreators.includes(creator)) {
        setPreviousCreators(prev => [...prev, creator]);
      }
      
      // Runde in Supabase speichern
      const { data: round, error: roundError } = await supabase
        .from('rounds')
        .insert({
          tournament_id: currentTournamentId,
          round_number: currentRound,
          track_name: trackName,
          track_number: trackNumber,
          creator: creator
        })
        .select()
        .single();

      if (roundError) throw roundError;

      // Rundenergebnisse in Supabase speichern
      const roundResults = [];
      for (let i = 0; i < rankings.length; i++) {
        const player = rankings[i];
        const position = i + 1;
        const points = position <= 3 ? pointsMap[position as keyof typeof pointsMap] : 0;

        const { data: dbPlayer } = await supabase
          .from('players')
          .select('id')
          .eq('name', player.name)
          .single();

        if (dbPlayer) {
          await supabase
            .from('round_results')
            .insert({
              round_id: round.id,
              player_id: dbPlayer.id,
              position: position,
              points: points
            });
        }

        roundResults.push({
          round: currentRound,
          track: trackName,
          position,
          points
        });
      }
      
      setPlayerScores(prev => {
        const newScores = { ...prev };
        rankings.forEach((player, index) => {
          const position = index + 1;
          const points = position <= 3 ? pointsMap[position as keyof typeof pointsMap] : 0;
          
          if (newScores[player.id]) {
            newScores[player.id] = {
              ...newScores[player.id],
              totalPoints: newScores[player.id].totalPoints + points,
              roundScores: [...newScores[player.id].roundScores, points]
            };
          }
        });
        return newScores;
      });
      
      setCurrentRound(prev => prev + 1);
      setGameState("leaderboard", { tournamentId: currentTournamentId });
      
      toast({
        title: "Runde gespeichert",
        description: `Runde ${currentRound} wurde erfolgreich gespeichert.`
      });
    } catch (error) {
      console.error('Fehler beim Speichern der Runde:', error);
      toast({
        title: "Fehler",
        description: "Runde konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const handleNextRound = () => {
    setGameState("player-edit");
  };

  const handleEndTournament = async () => {
    if (!currentTournamentId) return;
    
    try {
      // Turnier als beendet markieren
      await supabase
        .from('tournaments')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', currentTournamentId);
        
      setGameState("tournament-complete");
      
      toast({
        title: "Turnier beendet",
        description: "Das Turnier wurde erfolgreich abgeschlossen und gespeichert."
      });
    } catch (error) {
      console.error('Fehler beim Beenden des Turniers:', error);
      toast({
        title: "Fehler",
        description: "Turnier konnte nicht beendet werden.",
        variant: "destructive"
      });
    }
  };

  const handleNewTournament = () => {
    setGameState("player-selection");
    setSelectedPlayers([]);
    setCurrentRound(1);
    setPlayerScores({});
    setPreviousCreators([]);
    setCurrentTournamentId(null);
  };

  const handleShowStatistics = () => {
    setGameState("statistics");
  };

  const handleBackFromStatistics = () => {
    setGameState("player-selection");
  };

  const handleTournamentOverview = () => {
    setGameState("tournament-overview");
  };

  const handleBackFromTournaments = () => {
    setGameState("player-selection");
  };

  const handleShowLiveRanking = () => {
    setGameState("live-ranking");
  };

  const handleBackFromLiveRanking = () => {
    setGameState("player-selection");
  };

  const handleExcelImport = () => {
    setGameState("excel-import");
  };

  const handleImportComplete = () => {
    setGameState("statistics");
  };

  const handleStartExcelImport = async () => {
    try {
      toast({
        title: "Import gestartet",
        description: "Excel-Import läuft im Hintergrund. Das kann einige Minuten dauern..."
      });

      const { data, error } = await supabase.functions.invoke('excel-import', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: "Import erfolgreich",
        description: `${data.tournamentsToProcess} Turniere werden verarbeitet. Status: ${data.status}`
      });
    } catch (error) {
      console.error('Excel Import Fehler:', error);
      toast({
        title: "Import Fehler",
        description: "Excel-Import konnte nicht gestartet werden.",
        variant: "destructive"
      });
    }
  };

  const handleContinueTournament = async (tournamentId: string) => {
    try {
      // Lade Turnier-Daten
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;

      // Lade Spieler des Turniers
      const { data: tournamentPlayers, error: playersError } = await supabase
        .from('tournament_players')
        .select('players(*)')
        .eq('tournament_id', tournamentId);

      if (playersError) throw playersError;

      // Lade aktuelle Runde
      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select('round_number')
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: false })
        .limit(1);

      if (roundsError) throw roundsError;

      // Lade Spieler-Scores
      const { data: results, error: resultsError } = await supabase
        .from('round_results')
        .select(`
          player_id,
          points,
          rounds!inner(tournament_id)
        `)
        .eq('rounds.tournament_id', tournamentId);

      if (resultsError) throw resultsError;

      // Berechne Scores
      const scores: { [key: string]: PlayerScore } = {};
      tournamentPlayers?.forEach(tp => {
        const player = tp.players;
        if (player) {
          scores[player.id] = {
            playerId: player.id,
            playerName: player.name,
            totalPoints: 0,
            roundScores: []
          };
        }
      });

      results?.forEach(result => {
        if (scores[result.player_id]) {
          scores[result.player_id].totalPoints += result.points;
        }
      });

      // Setze Zustand
      setCurrentTournamentId(tournamentId);
      setSelectedPlayers(tournamentPlayers?.map(tp => tp.players).filter(Boolean) || []);
      setPlayerScores(scores);
      setCurrentRound((rounds?.[0]?.round_number || 0) + 1);
      
      if (tournament.completed_at) {
        setGameState('tournament-complete');
      } else {
        setGameState('round-input');
      }

      toast({
        title: "Turnier geladen",
        description: `${tournament.name} wurde erfolgreich geladen.`
      });
    } catch (error) {
      console.error('Fehler beim Laden des Turniers:', error);
      toast({
        title: "Fehler",
        description: "Turnier konnte nicht geladen werden.",
        variant: "destructive"
      });
    }
  };

  const handlePlayersConfirmed = (newPlayers: Player[]) => {
    setSelectedPlayers(newPlayers);
    
    // Aktualisiere playerScores: Neue Spieler hinzufügen, entfernte behalten ihre Punkte
    setPlayerScores(prevScores => {
      const newScores: { [key: string]: PlayerScore } = {};
      
      // Bestehende Spieler beibehalten
      newPlayers.forEach(player => {
        if (prevScores[player.id]) {
          newScores[player.id] = prevScores[player.id];
        } else {
          // Neuer Spieler
          newScores[player.id] = {
            playerId: player.id,
            playerName: player.name,
            totalPoints: 0,
            roundScores: []
          };
        }
      });
      
      return newScores;
    });
    
    setGameState("round-input");
  };

  const handlePlayerDetailView = (playerId: string, playerName: string) => {
    setSelectedPlayerId(playerId);
    setSelectedPlayerName(playerName);
    setGameState("player-detail", { playerId });
  };

  const handleBackFromPlayerDetail = () => {
    if (currentTournamentId) {
      setGameState("leaderboard");
    } else {
      setGameState("player-selection");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-optimized header */}
      <div className="fixed top-2 right-2 z-50 flex items-center gap-1 sm:gap-2 sm:top-4 sm:right-4">
        <div className="flex items-center gap-1 sm:gap-2 bg-background/90 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 border shadow-lg">
          <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="text-xs sm:text-sm">
              {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs sm:text-sm font-medium hidden xs:inline max-w-[80px] sm:max-w-none truncate">
            {profile?.display_name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="h-6 w-6 sm:h-8 sm:w-8 p-0"
          >
            <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
        <ThemeToggle />
        <LiveChat 
          roomId="general" 
          userName={profile?.display_name || 'Anonymous'}
          isMinimized={chatMinimized}
          onToggleMinimize={() => setChatMinimized(!chatMinimized)}
        />
      </div>

      {/* Mobile-safe container with proper padding */}
      <div className="container mx-auto px-2 py-4 pb-20 sm:px-4 max-w-full overflow-x-hidden">
        {gameState === "player-selection" && (
          <PlayerSelection
            onPlayersSelected={handleStartTournament}
            onShowStatistics={handleShowStatistics}
            onTournamentOverview={handleTournamentOverview}
            onShowLiveRanking={handleShowLiveRanking}
            onShowExcelImport={handleExcelImport}
            onJoinTournament={handleContinueTournament}
            isCurrentTournament={!!currentTournamentId}
            currentTournamentId={currentTournamentId}
          />
        )}

        {gameState === "player-edit" && (
          <PlayerEdit
            selectedPlayers={selectedPlayers}
            onPlayersConfirmed={handlePlayersConfirmed}
            currentRound={currentRound}
          />
        )}

        {gameState === "round-input" && (
          <RoundInput
            players={selectedPlayers}
            roundNumber={currentRound}
            onRoundComplete={handleRoundComplete}
            onPlayersChange={setSelectedPlayers}
            onBack={() => setGameState("player-selection")}
          />
        )}

        {gameState === "leaderboard" && (
          <Leaderboard
            playerScores={Object.values(playerScores).map(score => ({
              player: { id: score.playerId, name: score.playerName },
              totalPoints: score.totalPoints,
              roundResults: []
            }))}
            currentRound={currentRound}
            onNextRound={handleNextRound}
            onEndTournament={handleEndTournament}
            onPlayerClick={handlePlayerDetailView}
            onBack={handleNewTournament}
          />
        )}

        {gameState === "tournament-complete" && (
          <TournamentComplete
            playerScores={Object.values(playerScores).map(score => ({
              player: { id: score.playerId, name: score.playerName },
              totalPoints: score.totalPoints,
              roundResults: []
            }))}
            onNewTournament={handleNewTournament}
          />
        )}

        {gameState === "statistics" && (
          <Statistics onBack={handleBackFromStatistics} onPlayerClick={handlePlayerDetailView} />
        )}

        {gameState === "excel-import" && (
          <ExcelImport
            onBack={() => setGameState("player-selection")}
            onImportComplete={handleImportComplete}
          />
        )}

        {gameState === "player-detail" && selectedPlayerId && (
          <PlayerDetail
            playerId={selectedPlayerId}
            playerName={selectedPlayerName}
            onBack={handleBackFromPlayerDetail}
          />
        )}

        {gameState === "tournament-overview" && (
          <TournamentOverview
            onBack={handleBackFromTournaments}
            onContinueTournament={handleContinueTournament}
            currentTournamentId={currentTournamentId}
            onDeleteTournament={(tournamentId) => {
              // Tournament was deleted, refresh any local state if needed
              console.log(`Tournament ${tournamentId} was deleted`);
            }}
          />
        )}

        {gameState === "live-ranking" && (
          <LiveRanking onBack={handleBackFromLiveRanking} />
        )}
      </div>
    </div>
  );
};

export default Index;
