-- Erst die falschen Namen löschen
DELETE FROM players;

-- Dann die richtigen Namen aus der Excel-Datei einfügen
INSERT INTO players (name) VALUES 
('Felix W'),
('Thali'),
('Tho'),
('Andi'),
('Michel'),
('Igor'),
('Felix'),
('Dani'),
('Yve'),
('Peter'),
('Mary'),
('Rochen'),
('Mikey'),
('Phil'),
('Jana'),
('Grischa'),
('Alex'),
('Steffen'),
('Franz'),
('Andi G');