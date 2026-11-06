CREATE TABLE results (
 id uuid PRIMARY KEY, pupil text NOT NULL, name text NOT NULL,
 classroom text NOT NULL, alias text NOT NULL, xp integer NOT NULL,
 lamps integer NOT NULL, answers text NOT NULL, created bigint NOT NULL
);
CREATE INDEX results_pupil_scores ON results(pupil, xp DESC, created) WHERE lamps=8;
