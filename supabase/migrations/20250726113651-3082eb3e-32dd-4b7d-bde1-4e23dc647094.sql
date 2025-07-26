-- Füge die 20 echten Spielernamen ein
INSERT INTO players (name) VALUES 
('Felix'),
('Thali'), 
('Igor'),
('Andi'),
('Tho'),
('Steffen'),
('Alex'),
('Mary'),
('Peter'),
('Andi G'),
('Phil'),
('Felix W'),
('Yve'),
('Dani'),
('Grischa'),
('Rochen'),
('Jana'),
('Franz'),
('Michel'),
('Mikey');

-- Bestätige dass alle 20 Spieler eingefügt wurden
SELECT COUNT(*) as anzahl_spieler FROM players;