-- Create storage bucket for Excel uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('excel-imports', 'excel-imports', true);

-- Create policies for excel import bucket
CREATE POLICY "Anyone can upload Excel files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'excel-imports');

CREATE POLICY "Anyone can view uploaded Excel files" ON storage.objects
FOR SELECT USING (bucket_id = 'excel-imports');

CREATE POLICY "Anyone can delete Excel files" ON storage.objects
FOR DELETE USING (bucket_id = 'excel-imports');