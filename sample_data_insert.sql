-- Dati di esempio per testare il pannello admin
-- Esegui questo script nel tuo database Supabase

-- 1. Inserisci prodotti di esempio
INSERT INTO public.products (
  name,
  slug,
  description,
  short_description,
  price,
  original_price,
  category,
  image_url,
  stock,
  is_active,
  featured,
  weight,
  ingredients,
  allergens,
  origin,
  storage_instructions
) VALUES 
(
  'Miele di Acacia Biologico',
  'miele-di-acacia-biologico',
  'Il nostro miele di acacia biologico è raccolto dalle fioriture primaverili degli alberi di acacia. Ha un sapore delicato e cristallino, perfetto per dolcificare tè e tisane senza alterarne il gusto.',
  'Miele delicato e cristallino dalle fioriture di acacia',
  24.90,
  29.90,
  'acacia',
  'assets/images/honey-jar.jpg',
  50,
  true,
  true,
  0.500,
  ARRAY['miele di acacia biologico'],
  ARRAY['può contenere tracce di polline'],
  'Toscana, Italia',
  'Conservare in luogo fresco e asciutto'
),
(
  'Miele di Castagno',
  'miele-di-castagno',
  'Un miele dal sapore intenso e caratteristico, raccolto dalle fioriture estive dei castagni. Ricco di minerali e dal colore ambrato scuro, è perfetto per chi ama i sapori decisi.',
  'Miele intenso e caratteristico dai castagni',
  26.50,
  NULL,
  'castagno',
  'assets/images/honey-jar.jpg',
  35,
  true,
  true,
  0.500,
  ARRAY['miele di castagno'],
  ARRAY['può contenere tracce di polline'],
  'Umbria, Italia',
  'Conservare in luogo fresco e asciutto'
),
(
  'Miele Millefiori di Montagna',
  'miele-millefiori-di-montagna',
  'Un miele ricco e variegato, prodotto dalle api che bottinano sui fiori di montagna. Ogni vasetto racchiude la biodiversità dei prati alpini con un sapore unico e complesso.',
  'Miele variegato dai fiori di montagna',
  22.00,
  25.00,
  'millefiori',
  'assets/images/honey-jar.jpg',
  42,
  true,
  false,
  0.500,
  ARRAY['miele millefiori'],
  ARRAY['può contenere tracce di polline'],
  'Alto Adige, Italia',
  'Conservare in luogo fresco e asciutto'
),
(
  'Miele di Tiglio',
  'miele-di-tiglio',
  'Il miele di tiglio ha proprietà balsamiche e un aroma fresco e mentolato. Raccolto durante la fioritura estiva dei tigli, è ideale per lenire la gola e favorire il riposo.',
  'Miele balsamico dall''aroma fresco',
  28.00,
  NULL,
  'tiglio',
  'assets/images/honey-jar.jpg',
  25,
  true,
  false,
  0.500,
  ARRAY['miele di tiglio'],
  ARRAY['può contenere tracce di polline'],
  'Piemonte, Italia',
  'Conservare in luogo fresco e asciutto'
),
(
  'Miele di Eucalipto',
  'miele-di-eucalipto',
  'Un miele dalle proprietà benefiche per le vie respiratorie. Il sapore è intenso con note balsamiche, perfetto per tisane serali o come rimedio naturale per il mal di gola.',
  'Miele benefico per le vie respiratorie',
  25.50,
  NULL,
  'eucalipto',
  'assets/images/honey-jar.jpg',
  18,
  true,
  false,
  0.500,
  ARRAY['miele di eucalipto'],
  ARRAY['può contenere tracce di polline'],
  'Sardegna, Italia',
  'Conservare in luogo fresco e asciutto'
) ON CONFLICT (slug) DO NOTHING;

-- 2. Inserisci utenti di esempio (solo se non esistono già)
DO $$
BEGIN
  -- Controlla se esistono già utenti nella tabella profiles
  IF NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) THEN
    INSERT INTO public.profiles (id, first_name, last_name, role, created_at) 
    VALUES 
    (gen_random_uuid(), 'Mario', 'Rossi', 'user', NOW() - INTERVAL '30 days'),
    (gen_random_uuid(), 'Giulia', 'Bianchi', 'user', NOW() - INTERVAL '15 days'),
    (gen_random_uuid(), 'Marco', 'Verdi', 'user', NOW() - INTERVAL '7 days'),
    (gen_random_uuid(), 'Anna', 'Neri', 'user', NOW() - INTERVAL '3 days'),
    (gen_random_uuid(), 'Luca', 'Ferrari', 'user', NOW() - INTERVAL '20 days');
  END IF;
END $$;

-- 3. Inserisci ordini di esempio
DO $$
DECLARE
  user_record RECORD;
  product_record RECORD;
  order_id UUID;
BEGIN
  -- Solo se non esistono già ordini
  IF NOT EXISTS (SELECT 1 FROM public.orders LIMIT 1) THEN
    -- Per ogni utente, crea 1-3 ordini
    FOR user_record IN SELECT id FROM public.profiles WHERE role = 'user' LOOP
      -- Ordine 1
      INSERT INTO public.orders (
        user_id,
        total_price,
        subtotal,
        shipping_cost,
        status,
        billing_address,
        shipping_address,
        payment_method,
        payment_status,
        created_at
      ) VALUES (
        user_record.id,
        45.90,
        39.90,
        6.00,
        'completato',
        '{"first_name": "Cliente", "last_name": "Test", "address_line_1": "Via Roma 123", "city": "Milano", "postal_code": "20100", "country": "IT"}',
        '{"first_name": "Cliente", "last_name": "Test", "address_line_1": "Via Roma 123", "city": "Milano", "postal_code": "20100", "country": "IT"}',
        'card',
        'completed',
        NOW() - INTERVAL '1 day' * (random() * 30)::integer
      ) RETURNING id INTO order_id;
      
      -- Aggiungi elementi all'ordine
      FOR product_record IN SELECT id, price FROM public.products ORDER BY random() LIMIT 2 LOOP
        INSERT INTO public.order_items (order_id, product_id, quantity, price, total_price)
        VALUES (
          order_id,
          product_record.id,
          1,
          product_record.price,
          product_record.price
        );
      END LOOP;
      
      -- Ordine 2 (random se crearlo)
      IF random() > 0.3 THEN
        INSERT INTO public.orders (
          user_id,
          total_price,
          subtotal,
          shipping_cost,
          status,
          billing_address,
          shipping_address,
          payment_method,
          payment_status,
          created_at
        ) VALUES (
          user_record.id,
          72.50,
          66.50,
          6.00,
          CASE 
            WHEN random() < 0.3 THEN 'pending_payment'
            WHEN random() < 0.6 THEN 'in_corso'
            WHEN random() < 0.8 THEN 'spedito'
            ELSE 'completato'
          END,
          '{"first_name": "Cliente", "last_name": "Test", "address_line_1": "Via Roma 123", "city": "Milano", "postal_code": "20100", "country": "IT"}',
          '{"first_name": "Cliente", "last_name": "Test", "address_line_1": "Via Roma 123", "city": "Milano", "postal_code": "20100", "country": "IT"}',
          'card',
          'completed',
          NOW() - INTERVAL '1 day' * (random() * 15)::integer
        ) RETURNING id INTO order_id;
        
        -- Aggiungi elementi all'ordine
        FOR product_record IN SELECT id, price FROM public.products ORDER BY random() LIMIT 3 LOOP
          INSERT INTO public.order_items (order_id, product_id, quantity, price, total_price)
          VALUES (
            order_id,
            product_record.id,
            1 + floor(random() * 2)::integer,
            product_record.price,
            product_record.price * (1 + floor(random() * 2)::integer)
          );
        END LOOP;
      END IF;
    END LOOP;
  END IF;
END $$;

-- 4. Inserisci recensioni di esempio
DO $$
DECLARE
  order_record RECORD;
BEGIN
  -- Solo se non esistono già recensioni
  IF NOT EXISTS (SELECT 1 FROM public.reviews LIMIT 1) THEN
    FOR order_record IN 
      SELECT DISTINCT o.user_id, oi.product_id, o.id as order_id
      FROM public.orders o
      JOIN public.order_items oi ON o.id = oi.order_id
      WHERE o.status = 'completato'
      ORDER BY random()
      LIMIT 15
    LOOP
      INSERT INTO public.reviews (product_id, user_id, order_id, rating, comment, is_approved, created_at)
      VALUES (
        order_record.product_id,
        order_record.user_id,
        order_record.order_id,
        4 + floor(random() * 2)::integer, -- Rating tra 4 e 5
        CASE floor(random() * 5)::integer
          WHEN 0 THEN 'Ottimo miele, molto saporito e di alta qualità!'
          WHEN 1 THEN 'Prodotto eccellente, lo consiglio vivamente.'
          WHEN 2 THEN 'Miele genuino e dal sapore autentico. Perfetto!'
          WHEN 3 THEN 'Qualità superiore, packaging curato. Molto soddisfatto.'
          ELSE 'Davvero buonissimo, si sente la genuinità del prodotto.'
        END,
        random() < 0.7, -- 70% delle recensioni approvate
        NOW() - INTERVAL '1 day' * (random() * 20)::integer
      );
    END LOOP;
  END IF;
END $$;

-- 5. Messaggio di conferma
DO $$
BEGIN
  RAISE NOTICE 'Dati di esempio inseriti con successo!';
  RAISE NOTICE 'Prodotti: %', (SELECT COUNT(*) FROM public.products);
  RAISE NOTICE 'Utenti: %', (SELECT COUNT(*) FROM public.profiles);
  RAISE NOTICE 'Ordini: %', (SELECT COUNT(*) FROM public.orders);
  RAISE NOTICE 'Recensioni: %', (SELECT COUNT(*) FROM public.reviews);
END $$;
