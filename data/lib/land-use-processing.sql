-- Split up land use data as there are some very dense
-- multipolygons
CREATE TABLE IF NOT EXISTS land_use_split AS
SELECT (ST_Dump(geom)).geom AS geom,
gid AS gid_o, acres, luse1984, luse1990, luse1997, luse2000, luse2005, luse2010, luse2016,
dscrpt1984, dscrpt1990, dscrpt1997, dscrpt2000, dscrpt2005, dscrpt2010, dscrpt2016
FROM land_use;
ALTER TABLE land_use_split ADD COLUMN gid_s BIGSERIAL PRIMARY KEY;

-- Create indexes for geometries
CREATE INDEX land_use_split_gix ON land_use_split USING GIST (geom);
VACUUM ANALYZE land_use_split;
CLUSTER land_use_split USING land_use_split_gix;

CREATE INDEX mn_subcounties_gix ON mn_subcounties USING GIST (geom);
VACUUM ANALYZE mn_subcounties;
CLUSTER mn_subcounties USING mn_subcounties_gix;

CREATE INDEX mn_counties_gix ON mn_counties USING GIST (geom);
VACUUM ANALYZE mn_counties;
CLUSTER mn_counties USING mn_counties_gix;

-- Make sure polygons are valid.  Will take a little while.
UPDATE land_use_split SET geom = ST_MakeValid(geom) WHERE NOT ST_IsValid(geom);

-- Match and split on sub counties.
-- Make sure to keep field names to less than 10 characters for export
-- as shapefile.
CREATE TABLE land_use_split_sc AS
SELECT
  l.gid_o AS gid_o,
  l.gid_s AS gid_s,

  ST_Intersection(l.geom, c.geom) AS geom,

  l.luse1984 AS lu_1984,
  l.luse1990 AS lu_1990,
  l.luse1997 AS lu_1997,
  l.luse2000 AS lu_2000,
  l.luse2005 AS lu_2005,
  l.luse2010 AS lu_2010,
  l.luse2016 AS lu_2016,

  l.dscrpt1984 AS lud_1984,
  l.dscrpt1990 AS lud_1990,
  l.dscrpt1997 AS lud_1997,
  l.dscrpt2000 AS lud_2000,
  l.dscrpt2005 AS lud_2005,
  l.dscrpt2010 AS lud_2010,
  l.dscrpt2016 AS lud_2016,

  c.geoid AS sc_id
FROM land_use_split AS l
	LEFT JOIN mn_subcounties AS c
		ON ST_Intersects(l.geom, c.geom)
ORDER BY l.gid, l.gid_split;

-- Add primary key
ALTER TABLE land_use_split_sc ADD COLUMN gid_sc BIGSERIAL PRIMARY KEY;
VACUUM ANALYZE land_use_split_sc;


-- Match and split on counties.
-- Make sure to keep field names to less than 10 characters for export
-- as shapefile.
CREATE TABLE land_use_split_co AS
SELECT
  l.gid_o AS gid_o,
  l.gid_s AS gid_s,
  l.gid_sc AS gid_sc,

  ST_Intersection(l.geom, c.geom) AS geom,
  -- To add later
  0::float AS area,

  l.lu_1984 AS lu_1984,
  l.lu_1990 AS lu_1990,
  l.lu_1997 AS lu_1997,
  l.lu_2000 AS lu_2000,
  l.lu_2005 AS lu_2005,
  l.lu_2010 AS lu_2010,
  l.lu_2016 AS lu_2016,

  BTRIM(l.lud_1984) AS lud_1984,
  BTRIM(l.lud_1990) AS lud_1990,
  BTRIM(l.lud_1997) AS lud_1997,
  BTRIM(l.lud_2000) AS lud_2000,
  BTRIM(l.lud_2005) AS lud_2005,
  BTRIM(l.lud_2010) AS lud_2010,
  BTRIM(l.lud_2016) AS lud_2016,

  l.sc_id AS sc_id,
  c.geoid AS co_id
FROM land_use_split_sc AS l
	LEFT JOIN mn_counties AS c
		ON ST_Intersects(l.geom, c.geom)
ORDER BY l.gid_o, l.gid_s, l.gid_sc;

ALTER TABLE land_use_split_co ADD COLUMN gid_co BIGSERIAL PRIMARY KEY;
VACUUM ANALYZE land_use_split_co;

-- There are some points and lines that happen with the intersection
-- of the counties
DELETE FROM land_use_split_co WHERE
ST_GeometryType(geom) NOT IN ('ST_Polygon', 'ST_MultiPolygon')
OR co_id IS NULL;

-- Add area
UPDATE land_use_split_co SET area = ST_AREA(geom, true);
