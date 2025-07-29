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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Player {
  id: string;
  name: string;
}

interface PlayerScore {
  player: Player;
  totalPoints: number;
  roundResults: {
    round: number;
    track: string;
    position: number;
    points: number;
  }[];
}

type GameState = "player-selection" | "player-edit" | "round-input" | "leaderboard" | "tournament-complete" | "statistics" | "excel-import" | "player-detail" | "tournament-overview";

const Index = () => {
  const [gameState, setGameState] = useState<GameState>("player-selection");
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const [previousCreators, setPreviousCreators] = useState<string[]>([]); // Wird nicht mehr verwendet
  const [currentTournamentId, setCurrentTournamentId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
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
      setPlayerScores(players.map(player => ({
        player,
        totalPoints: 0,
        roundResults: []
      })));
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
      
      setPlayerScores(prev => prev.map(playerScore => {
        const rankIndex = rankings.findIndex(p => p.id === playerScore.player.id);
        const position = rankIndex + 1;
        const points = position <= 3 ? pointsMap[position as keyof typeof pointsMap] : 0;
        
        return {
          ...playerScore,
          totalPoints: playerScore.totalPoints + points,
          roundResults: [
            ...playerScore.roundResults,
            {
              round: currentRound,
              track: trackName,
              position,
              points
            }
          ]
        };
      }));
      
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
    setPlayerScores([]);
    setPreviousCreators([]);
    setCurrentTournamentId(null);
  };

  const handleShowStatistics = () => {
    setGameState("statistics");
  };

  const handleBackFromStatistics = () => {
    setGameState("player-selection");
  };

  const handleShowTournaments = () => {
    setGameState("tournament-overview");
  };

  const handleBackFromTournaments = () => {
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

  const handlePlayersConfirmed = (newPlayers: Player[]) => {
    setSelectedPlayers(newPlayers);
    
    // Aktualisiere playerScores: Neue Spieler hinzufügen, entfernte behalten ihre Punkte
    setPlayerScores(prevScores => {
      const newScores: PlayerScore[] = [];
      
      // Bestehende Spieler beibehalten
      newPlayers.forEach(player => {
        const existingScore = prevScores.find(score => score.player.id === player.id);
        if (existingScore) {
          newScores.push(existingScore);
        } else {
          // Neuer Spieler
          newScores.push({
            player,
            totalPoints: 0,
            roundResults: []
          });
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
    // Zurück zum vorherigen Zustand - je nach Kontext
    if (currentTournamentId) {
      setGameState("leaderboard");
    } else {
      setGameState("statistics");
    }
  };

  switch (gameState) {
    case "player-selection":
      return <PlayerSelection onStartTournament={handleStartTournament} onShowStatistics={handleShowStatistics} onShowTournaments={handleShowTournaments} />;
    
    case "player-edit":
      return (
        <PlayerEdit
          currentRound={currentRound}
          selectedPlayers={selectedPlayers}
          onPlayersConfirmed={handlePlayersConfirmed}
        />
      );
    
    case "round-input":
      return (
        <RoundInput
          roundNumber={currentRound}
          players={selectedPlayers}
          onRoundComplete={handleRoundComplete}
          onPlayersChange={handlePlayersConfirmed}
        />
      );
    
    case "leaderboard":
      return (
        <Leaderboard
          playerScores={playerScores}
          currentRound={currentRound}
          onNextRound={handleNextRound}
          onEndTournament={handleEndTournament}
          onPlayerClick={handlePlayerClick}
        />
      );
    
    case "tournament-complete":
      return (
        <TournamentComplete
          playerScores={playerScores}
          onNewTournament={handleNewTournament}
        />
      );
    
    case "statistics":
      return <Statistics onBack={handleBackFromStatistics} />;

    case "excel-import":
      return (
        <ExcelImport
          onImportComplete={handleImportComplete}
          onBack={handleBackFromStatistics}
        />
      );

    case "player-detail":
      return selectedPlayerId && selectedPlayerName ? (
        <PlayerDetail
          playerId={selectedPlayerId}
          playerName={selectedPlayerName}
          onBack={handleBackFromPlayerDetail}
        />
      ) : null;

    case "tournament-overview":
      return <TournamentOverview onBack={handleBackFromTournaments} currentTournamentId={currentTournamentId} />;
    
    default:
      return null;
  }
};

export default Index;