MERGE (d1:destination {name: "Adriatic"})
SET d1.min_lat = 40.9,
    d1.min_lon = 12.0,
    d1.max_lat = 46.9,
    d1.max_lon = 19.8,
    d1.updated_at = datetime();

MERGE (d2:destination {name: "Ionian Sea"})
SET d2.min_lat = 36.0,
    d2.min_lon = 19.0,
    d2.max_lat = 40.8,
    d2.max_lon = 22.0,
    d2.updated_at = datetime();
