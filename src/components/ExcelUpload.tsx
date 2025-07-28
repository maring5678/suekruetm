import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';

interface ExcelUploadProps {
  onImportComplete: () => void;
  onBack: () => void;
}

export const ExcelUpload = ({ onImportComplete, onBack }: ExcelUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      toast({
        title: "Ungültiger Dateityp",
        description: "Bitte wählen Sie eine Excel-Datei (.xlsx, .xls) oder CSV-Datei (.csv)",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Vorschau der Excel-Daten
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      setPreviewData(data.slice(0, 5)); // Erste 5 Zeilen als Vorschau
    } catch (error) {
      console.error('Fehler beim Lesen der Excel-Datei:', error);
      toast({
        title: "Fehler",
        description: "Excel-Datei konnte nicht gelesen werden",
        variant: "destructive",
      });
    }
  };

  const handleUploadAndImport = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    
    try {
      // Datei zu Supabase Storage hochladen
      const fileName = `import_${Date.now()}_${selectedFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('excel-imports')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Edge Function für Import aufrufen
      const { data, error } = await supabase.functions.invoke('excel-processor', {
        body: { fileName: uploadData.path }
      });

      if (error) throw error;

      toast({
        title: "Import erfolgreich",
        description: `${data.importedRecords} Datensätze wurden importiert`,
      });
      
      onImportComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Fehler beim Import",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <FileSpreadsheet className="h-12 w-12 text-primary" />
          </div>
          <CardTitle>Datei importieren</CardTitle>
          <CardDescription>
            Laden Sie Ihre Excel- oder CSV-Datei hoch, um die Turnierdaten zu importieren
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="excel-file">Excel- oder CSV-Datei auswählen</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </div>

          {selectedFile && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ausgewählte Datei: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </AlertDescription>
            </Alert>
          )}

          {previewData.length > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Vorschau der ersten Zeilen:</h4>
              <div className="text-xs font-mono bg-background p-2 rounded overflow-auto max-h-32">
                {previewData.map((row: any[], index) => (
                  <div key={index}>
                    {Array.isArray(row) ? row.join(' | ') : JSON.stringify(row)}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Falls die Datenstruktur nicht korrekt erscheint, geben Sie mir bitte Bescheid, 
                wie die Daten gelesen werden sollen.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={handleUploadAndImport}
              disabled={!selectedFile || isUploading}
              className="w-full"
              size="lg"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                  Importiere...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Datei hochladen und importieren
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onBack}
              className="w-full"
              disabled={isUploading}
            >
              Zurück
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};