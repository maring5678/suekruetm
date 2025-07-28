import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Upload, Database } from "lucide-react";

interface ExcelImportProps {
  onImportComplete: () => void;
  onBack: () => void;
}

export const ExcelImport = ({ onImportComplete, onBack }: ExcelImportProps) => {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleImportHistoricalData = async () => {
    setIsImporting(true);
    
    try {
      const response = await fetch('/functions/v1/excel-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Import gestartet",
          description: `Historische Daten werden importiert... (${result.playersToImport} Spieler)`,
        });
        
        // Warte einen Moment für den Import
        setTimeout(() => {
          toast({
            title: "Import abgeschlossen",
            description: "Historische Spielerdaten wurden erfolgreich importiert!",
          });
          onImportComplete();
        }, 3000);
      } else {
        throw new Error(result.error || 'Import fehlgeschlagen');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Fehler beim Import",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Upload className="h-12 w-12 text-primary" />
          </div>
          <CardTitle>Historische Daten importieren</CardTitle>
          <CardDescription>
            Importiere die historischen Spielerdaten aus der bisherigen Excel-Tabelle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4" />
              <span className="text-sm font-medium">Enthaltene Daten:</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Historische Gesamtpunktzahlen aller Spieler</li>
              <li>• Turnierstatistiken</li>
              <li>• Bisherige Leistungen</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleImportHistoricalData}
              disabled={isImporting}
              className="w-full"
              size="lg"
            >
              {isImporting ? "Importiere..." : "Historische Daten importieren"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onBack}
              className="w-full"
            >
              Zurück
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <p>⚠️ Achtung: Alle aktuellen Turnierdaten werden dabei überschrieben!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};