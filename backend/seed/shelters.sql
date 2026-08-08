-- backend/seed/shelters.sql
-- Person A owns this file.
-- 12 shelters around Vadodara, Gujarat (swap district/coords if your demo
-- targets a different city). Run once against a fresh schema:
--   psql "$DATABASE_URL" -f backend/seed/shelters.sql
-- Safe to re-run on a clean DB only — it does not TRUNCATE first, so if
-- you're re-seeding, wipe the tables yourself first (see note at bottom).

INSERT INTO shelters (name, address, latitude, longitude, total_capacity, contact_name, contact_phone, district, is_active) VALUES
('Sayajigunj Community Hall',        'Sayajigunj, Vadodara',              22.3126, 73.1770, 150, 'R. Patel',    '+91 98250 10001', 'Vadodara', TRUE),
('Alkapuri Relief Centre',           'RC Dutt Road, Alkapuri, Vadodara',  22.3080, 73.1685, 200, 'S. Mehta',    '+91 98250 10002', 'Vadodara', TRUE),
('Manjalpur Municipal School',       'Manjalpur, Vadodara',               22.2725, 73.1875, 120, 'K. Joshi',    '+91 98250 10003', 'Vadodara', TRUE),
('Gotri Government School',         'Gotri Road, Vadodara',              22.3211, 73.1526, 180, 'N. Rana',     '+91 98250 10004', 'Vadodara', TRUE),
('Waghodia Road Community Centre',  'Waghodia Road, Vadodara',           22.3244, 73.2255, 100, 'A. Solanki',  '+91 98250 10005', 'Vadodara', TRUE),
('Fatehgunj Sports Complex',        'Fatehgunj, Vadodara',               22.3252, 73.1898, 250, 'V. Chauhan',  '+91 98250 10006', 'Vadodara', TRUE),
('Karelibaug Town Hall',            'Karelibaug, Vadodara',              22.3181, 73.2079, 90,  'D. Trivedi',  '+91 98250 10007', 'Vadodara', TRUE),
('Sama Savli Road Shelter',         'Sama-Savli Road, Vadodara',         22.3421, 73.1974, 140, 'P. Desai',    '+91 98250 10008', 'Vadodara', TRUE),
('Nizampura Community School',      'Nizampura, Vadodara',               22.3305, 73.1793, 110, 'H. Shah',     '+91 98250 10009', 'Vadodara', TRUE),
('Makarpura GIDC Relief Camp',      'Makarpura, Vadodara',               22.2570, 73.1935, 220, 'M. Vaghela',  '+91 98250 10010', 'Vadodara', TRUE),
('Vasna Road Community Hall',       'Vasna Road, Vadodara',              22.2843, 73.1721, 130, 'J. Pandya',   '+91 98250 10011', 'Vadodara', TRUE),
('Chhani Jakat Naka Shelter',       'Chhani, Vadodara',                  22.3517, 73.1631, 160, 'R. Baria',    '+91 98250 10012', 'Vadodara', TRUE);

-- Initial resource_updates row per shelter (deliberately varied so the map
-- shows all 3 pin colors and the coordinator dashboard has something to show)
-- updated_by is NULL here on purpose — no users row is required to exist yet.
INSERT INTO resource_updates (shelter_id, current_occupancy, beds_available, food_status, medicine_status, updated_by)
SELECT id, occ, beds, food, med, NULL
FROM (VALUES
  ('Sayajigunj Community Hall',       60,  90, 'adequate', 'adequate'),
  ('Alkapuri Relief Centre',          190, 10, 'low',      'adequate'),
  ('Manjalpur Municipal School',      120, 0,  'critical', 'critical'),
  ('Gotri Government School',         50,  130,'adequate', 'adequate'),
  ('Waghodia Road Community Centre',  95,  5,  'low',      'low'),
  ('Fatehgunj Sports Complex',        80,  170,'adequate', 'adequate'),
  ('Karelibaug Town Hall',            90,  0,  'critical', 'low'),
  ('Sama Savli Road Shelter',         40,  100,'adequate', 'adequate'),
  ('Nizampura Community School',      70,  40, 'adequate', 'low'),
  ('Makarpura GIDC Relief Camp',      150, 70, 'adequate', 'adequate'),
  ('Vasna Road Community Hall',       125, 5,  'low',      'critical'),
  ('Chhani Jakat Naka Shelter',       60,  100,'adequate', 'adequate')
) AS seed_data(name, occ, beds, food, med)
JOIN shelters ON shelters.name = seed_data.name;

-- To re-seed from scratch:
-- TRUNCATE resource_updates, notification_log, persons, shelters RESTART IDENTITY CASCADE;
