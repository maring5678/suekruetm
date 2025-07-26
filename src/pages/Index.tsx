import { useState, useEffect } from "react";
import { PlayerSelection } from "@/components/PlayerSelection";
import { RoundInput } from "@/components/RoundInput";
import { Leaderboard } from "@/components/Leaderboard";
import { TournamentComplete } from "@/components/TournamentComplete";
import { Statistics } from "@/components/Statistics";
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

type GameState = "player-selection" | "round-input" | "leaderboard" | "tournament-complete" | "statistics";

const Index = () => {
  const [gameState, setGameState] = useState<GameState>("player-selection");
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const [previousCreators, setPreviousCreators] = useState<string[]>([]); // Wird nicht mehr verwendet
  const [currentTournamentId, setCurrentTournamentId] = useState<string | null>(null);
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
      const pointsMap = { 1: 3, 2: 2, 3: 1 };
      
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
    setGameState("round-input");
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

  switch (gameState) {
    case "player-selection":
      return <PlayerSelection onStartTournament={handleStartTournament} onShowStatistics={handleShowStatistics} />;
    
    case "round-input":
      return (
        <RoundInput
          roundNumber={currentRound}
          players={selectedPlayers}
          onRoundComplete={handleRoundComplete}
        />
      );
    
    case "leaderboard":
      return (
        <Leaderboard
          playerScores={playerScores}
          currentRound={currentRound}
          onNextRound={handleNextRound}
          onEndTournament={handleEndTournament}
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
    
    default:
      return null;
  }
};

export default Index;
