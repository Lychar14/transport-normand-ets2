-- v57 — Distance acceptée déclarée par le chauffeur à la soumission de la
-- preuve, créditée automatiquement au compteur de km (distance_entries) à la
-- validation par le patron — plus besoin de ressaisie manuelle en fiche joueur.

ALTER TABLE preuves_livraison
  ADD COLUMN IF NOT EXISTS distance_declaree integer;

-- Rattache une entrée de distance à la mission qui l'a générée : garde-fou
-- anti-doublon si le bouton "Valider" est cliqué deux fois rapidement.
ALTER TABLE distance_entries
  ADD COLUMN IF NOT EXISTS mission_id uuid REFERENCES missions(id);
