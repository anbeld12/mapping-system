-- Seed sintético para pruebas de rendimiento / carga
-- Genera ~500 bloques y ~5 casas por bloque (2,500 casas aprox.)
-- Coordenadas centradas cerca de Bogotá, grilla desplazada para evitar solapes.

DO $$
DECLARE
  base_lng numeric := -74.1;
  base_lat numeric := 4.6;
  block_size numeric := 0.0005; -- ~55m
  gap numeric := 0.0001;        -- separación entre bloques
  idx integer := 0;
  houses_per_block integer := 5;
  blk_id uuid;
  i integer;
  j integer;
BEGIN
  FOR i IN 0..19 LOOP         -- 20 filas
    FOR j IN 0..24 LOOP       -- 25 columnas => 20*25 = 500 bloques
      idx := idx + 1;
      -- Coordenadas del bloque (rectángulo simple)
      -- lng: x, lat: y
      -- Esquina inferior izquierda
      DECLARE
        x0 numeric := base_lng + j * (block_size + gap);
        y0 numeric := base_lat + i * (block_size + gap);
        x1 numeric := x0 + block_size;
        y1 numeric := y0 + block_size;
      BEGIN
        INSERT INTO blocks (name, geom, division_points, capture_method)
        VALUES (
          CONCAT('Seed Block ', idx),
          ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
            ST_Point(x0, y0),
            ST_Point(x1, y0),
            ST_Point(x1, y1),
            ST_Point(x0, y1),
            ST_Point(x0, y0)
          ])), 4326),
          '[]'::jsonb,
          'manual'
        ) RETURNING id INTO blk_id;

        -- Generar casas como subdivisión simple lineal sobre el frente inferior
        -- Se dibuja una pequeña franja del frente con offsets
        FOR h IN 1..houses_per_block LOOP
          DECLARE
            frac_start numeric := (h - 1)::numeric / houses_per_block;
            frac_end   numeric := (h)::numeric / houses_per_block;
            hx0 numeric := x0 + frac_start * (x1 - x0);
            hx1 numeric := x0 + frac_end   * (x1 - x0);
            hy0 numeric := y0;
            hy1 numeric := y0 + (block_size * 0.6); -- profundidad de la casa
          BEGIN
            INSERT INTO houses (block_id, geom, house_number)
            VALUES (
              blk_id,
              ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
                ST_Point(hx0, hy0),
                ST_Point(hx1, hy0),
                ST_Point(hx1, hy1),
                ST_Point(hx0, hy1),
                ST_Point(hx0, hy0)
              ])), 4326),
              h
            );
          END;
        END LOOP;
      END;
    END LOOP;
  END LOOP;
END $$;