import { useState, useEffect } from "react";
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
import { useGameState } from "@/hooks/useGameState";

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

const Index = () => {
  const { gameState, setGameState, previousState } = useGameState("player-selection");
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [playerScores, setPlayerScores] = useState<{ [key: string]: PlayerScore }>({});
  const [previousCreators, setPreviousCreators] = useState<string[]>([]); // Wird nicht mehr verwendet
  const [currentTournamentId, setCurrentTournamentId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
  const [chatMinimized, setChatMinimized] = useState(true);
  const [userName] = useState(`Spieler${Math.floor(Math.random() * 1000)}`);
  const { toast } = useToast();

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
      setGameState("round-input");
      
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
      setGameState("leaderboard");
      
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

  const handlePlayerClick = (playerId: string, playerName: string) => {
    setSelectedPlayerId(playerId);
    setSelectedPlayerName(playerName);
    setGameState("player-detail");
  };

  const handleBackFromPlayerDetail = () => {
    setSelectedPlayerId(null);
    setSelectedPlayerName(null);
    // Intelligenter Rücksprung basierend auf vorherigem Zustand
    if (previousState && ['leaderboard', 'statistics', 'tournament-overview'].includes(previousState)) {
      setGameState(previousState);
    } else if (currentTournamentId) {
      setGameState("leaderboard");
    } else {
      setGameState("statistics");
    }
  };

  // Convert playerScores object to array format for components that expect array
  const playerScoresArray = Object.values(playerScores).map(score => ({
    player: { id: score.playerId, name: score.playerName },
    totalPoints: score.totalPoints,
    roundResults: score.roundScores.map((points, index) => ({
      round: index + 1,
      track: `Track ${index + 1}`,
      position: 1, // Simplified for now
      points
    }))
  }));

  // Rendere Theme Toggle und Live Chat für alle Zustände
  const renderWithGlobalFeatures = (content: React.ReactNode) => (
    <>
      {content}
      
      {/* Theme Toggle - immer sichtbar */}
      <div className="fixed top-4 right-4 z-40">
        <ThemeToggle />
      </div>
      
      {/* Live Chat - nur wenn Turnier aktiv oder in bestimmten Zuständen */}
      {(currentTournamentId || ['leaderboard', 'round-input', 'tournament-complete'].includes(gameState)) && (
        <LiveChat 
          roomId={currentTournamentId || "main-lobby"}
          userName={userName}
          isMinimized={chatMinimized}
          onToggleMinimize={() => setChatMinimized(!chatMinimized)}
        />
      )}
    </>
  );

  switch (gameState) {
    case "player-selection":
      return renderWithGlobalFeatures(
        <PlayerSelection 
          onPlayersSelected={handleStartTournament}
          onShowStatistics={handleShowStatistics}
          onShowExcelImport={handleExcelImport}
          onTournamentOverview={handleTournamentOverview}
          onJoinTournament={handleContinueTournament}
          isCurrentTournament={!!currentTournamentId}
          currentTournamentId={currentTournamentId}
          onShowLiveRanking={handleShowLiveRanking}
        />
      );
    
    case "live-ranking":
      return renderWithGlobalFeatures(
        <LiveRanking 
          onBack={handleBackFromLiveRanking}
          currentTournamentId={currentTournamentId}
        />
      );
    
    case "player-edit":
      return renderWithGlobalFeatures(
        <PlayerEdit
          currentRound={currentRound}
          selectedPlayers={selectedPlayers}
          onPlayersConfirmed={handlePlayersConfirmed}
        />
      );
    
    case "round-input":
      return renderWithGlobalFeatures(
        <RoundInput
          roundNumber={currentRound}
          players={selectedPlayers}
          onRoundComplete={handleRoundComplete}
          onPlayersChange={handlePlayersConfirmed}
          onBack={() => setGameState('player-selection')}
        />
      );
    
    case "leaderboard":
      return renderWithGlobalFeatures(
        <Leaderboard
          playerScores={playerScoresArray}
          currentRound={currentRound}
          onNextRound={handleNextRound}
          onEndTournament={handleEndTournament}
          onPlayerClick={handlePlayerClick}
          onBack={() => setGameState('round-input')}
        />
      );
    
    case "tournament-complete":
      return renderWithGlobalFeatures(
        <TournamentComplete
          playerScores={playerScoresArray}
          onNewTournament={handleNewTournament}
          onPlayerClick={handlePlayerClick}
          onBack={() => setGameState('player-selection')}
        />
      );
    
    case "statistics":
      return renderWithGlobalFeatures(
        <Statistics onBack={handleBackFromStatistics} onPlayerClick={handlePlayerClick} />
      );

    case "excel-import":
      return renderWithGlobalFeatures(
        <ExcelImport
          onImportComplete={handleImportComplete}
          onBack={handleBackFromStatistics}
        />
      );

    case "player-detail":
      return selectedPlayerId && selectedPlayerName ? renderWithGlobalFeatures(
        <PlayerDetail
          playerId={selectedPlayerId}
          playerName={selectedPlayerName}
          onBack={handleBackFromPlayerDetail}
        />
      ) : null;

    case "tournament-overview":
      return renderWithGlobalFeatures(
        <TournamentOverview 
          onBack={() => setGameState('player-selection')}
          currentTournamentId={currentTournamentId}
          onContinueTournament={handleContinueTournament}
          onDeleteTournament={(tournamentId) => {
            if (tournamentId === currentTournamentId) {
              setCurrentTournamentId(null);
            }
          }}
        />
      );
    
    default:
      return renderWithGlobalFeatures(
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Unbekannter Zustand</p>
        </div>
      );
  }
};

export default Index;
