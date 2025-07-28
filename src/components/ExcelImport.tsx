import { ExcelUpload } from "./ExcelUpload";

interface ExcelImportProps {
  onImportComplete: () => void;
  onBack: () => void;
}

export const ExcelImport = ({ onImportComplete, onBack }: ExcelImportProps) => {
  return (
    <ExcelUpload 
      onImportComplete={onImportComplete}
      onBack={onBack}
    />
  );
};