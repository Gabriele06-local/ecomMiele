-- Funzioni di utilità per il database

-- ===== FUNZIONI PER LA GESTIONE DELLO STOCK =====

-- Funzione per decrementare lo stock di un prodotto
CREATE OR REPLACE FUNCTION decrement_product_stock(
    product_id UUID,
    quantity INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    current_stock INTEGER;
BEGIN
    -- Verifica che il prodotto esista e abbia stock sufficiente
    SELECT stock INTO current_stock
    FROM products
    WHERE id = product_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found or inactive: %', product_id;
    END IF;
    
    IF current_stock < quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', current_stock, quantity;
    END IF;
    
    -- Decrementa lo stock
    UPDATE products
    SET stock = stock - quantity,
        updated_at = NOW()
    WHERE id = product_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Funzione per incrementare lo stock di un prodotto
CREATE OR REPLACE FUNCTION increment_product_stock(
    product_id UUID,
    quantity INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE products
    SET stock = stock + quantity,
        updated_at = NOW()
    WHERE id = product_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found or inactive: %', product_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Funzione per verificare la disponibilità di stock
CREATE OR REPLACE FUNCTION check_product_availability(
    product_id UUID,
    quantity INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    available_stock INTEGER;
BEGIN
    SELECT stock INTO available_stock
    FROM products
    WHERE id = product_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    RETURN available_stock >= quantity;
END;
$$ LANGUAGE plpgsql;

-- ===== FUNZIONI PER I PUNTI FEDELTÀ =====

-- Funzione per incrementare i punti fedeltà di un utente
CREATE OR REPLACE FUNCTION increment_loyalty_points(
    user_id UUID,
    points INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE profiles
    SET loyalty_points = loyalty_points + points,
        updated_at = NOW()
    WHERE id = user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', user_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Funzione per decrementare i punti fedeltà di un utente
CREATE OR REPLACE FUNCTION decrement_loyalty_points(
    user_id UUID,
    points INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    current_points INTEGER;
BEGIN
    SELECT loyalty_points INTO current_points
    FROM profiles
    WHERE id = user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', user_id;
    END IF;
    
    IF current_points < points THEN
        RAISE EXCEPTION 'Insufficient loyalty points. Available: %, Requested: %', current_points, points;
    END IF;
    
    UPDATE profiles
    SET loyalty_points = loyalty_points - points,
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ===== FUNZIONI PER LA GESTIONE DEI COUPON =====

-- Funzione per validare un coupon
CREATE OR REPLACE FUNCTION validate_coupon(
    coupon_code TEXT,
    order_amount DECIMAL
) RETURNS TABLE (
    is_valid BOOLEAN,
    discount_amount DECIMAL,
    coupon_id UUID,
    error_message TEXT
) AS $$
DECLARE
    coupon_record RECORD;
    calculated_discount DECIMAL := 0;
BEGIN
    -- Cerca il coupon
    SELECT * INTO coupon_record
    FROM coupons
    WHERE UPPER(code) = UPPER(coupon_code)
      AND is_active = true
      AND (valid_until IS NULL OR valid_until > NOW())
      AND (usage_limit IS NULL OR usage_count < usage_limit);
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0::DECIMAL, NULL::UUID, 'Coupon not found or expired'::TEXT;
        RETURN;
    END IF;
    
    -- Verifica l'importo minimo
    IF order_amount < coupon_record.minimum_amount THEN
        RETURN QUERY SELECT FALSE, 0::DECIMAL, coupon_record.id, 
                    ('Minimum order amount not met: €' || coupon_record.minimum_amount)::TEXT;
        RETURN;
    END IF;
    
    -- Calcola lo sconto
    CASE coupon_record.type
        WHEN 'percentage' THEN
            calculated_discount := (order_amount * coupon_record.value) / 100;
            IF coupon_record.maximum_discount IS NOT NULL THEN
                calculated_discount := LEAST(calculated_discount, coupon_record.maximum_discount);
            END IF;
        WHEN 'fixed_amount' THEN
            calculated_discount := coupon_record.value;
        WHEN 'free_shipping' THEN
            calculated_discount := 0; -- Gestito separatamente
    END CASE;
    
    RETURN QUERY SELECT TRUE, calculated_discount, coupon_record.id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ===== FUNZIONI PER LE STATISTICHE =====

-- Funzione per ottenere le statistiche di un prodotto
CREATE OR REPLACE FUNCTION get_product_stats(product_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_orders', COUNT(DISTINCT oi.order_id),
        'total_quantity_sold', COALESCE(SUM(oi.quantity), 0),
        'total_revenue', COALESCE(SUM(oi.total_price), 0),
        'average_rating', COALESCE(AVG(r.rating), 0),
        'review_count', COUNT(r.id),
        'five_star_count', COUNT(CASE WHEN r.rating = 5 THEN 1 END),
        'four_star_count', COUNT(CASE WHEN r.rating = 4 THEN 1 END),
        'three_star_count', COUNT(CASE WHEN r.rating = 3 THEN 1 END),
        'two_star_count', COUNT(CASE WHEN r.rating = 2 THEN 1 END),
        'one_star_count', COUNT(CASE WHEN r.rating = 1 THEN 1 END)
    ) INTO result
    FROM order_items oi
    LEFT JOIN reviews r ON oi.product_id = r.product_id AND r.is_approved = true
    WHERE oi.product_id = get_product_stats.product_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per ottenere le statistiche dell'admin
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_orders', COUNT(*),
        'total_revenue', COALESCE(SUM(total_price), 0),
        'total_customers', COUNT(DISTINCT user_id),
        'pending_orders', COUNT(CASE WHEN status = 'pending_payment' THEN 1 END),
        'in_progress_orders', COUNT(CASE WHEN status = 'in_corso' THEN 1 END),
        'shipped_orders', COUNT(CASE WHEN status = 'spedito' THEN 1 END),
        'completed_orders', COUNT(CASE WHEN status = 'completato' THEN 1 END),
        'cancelled_orders', COUNT(CASE WHEN status = 'cancellato' THEN 1 END),
        'average_order_value', COALESCE(AVG(total_price), 0),
        'total_products', (SELECT COUNT(*) FROM products WHERE is_active = true),
        'pending_reviews', (SELECT COUNT(*) FROM reviews WHERE is_approved = false),
        'total_reviews', (SELECT COUNT(*) FROM reviews),
        'average_rating', (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE is_approved = true)
    ) INTO result
    FROM orders;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== FUNZIONI PER LA RICERCA =====

-- Funzione per la ricerca di prodotti
CREATE OR REPLACE FUNCTION search_products(
    search_query TEXT,
    category_filter TEXT DEFAULT NULL,
    min_price DECIMAL DEFAULT NULL,
    max_price DECIMAL DEFAULT NULL,
    sort_by TEXT DEFAULT 'name',
    sort_direction TEXT DEFAULT 'asc',
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    description TEXT,
    price DECIMAL,
    category TEXT,
    image_url TEXT,
    stock INTEGER,
    is_active BOOLEAN,
    featured BOOLEAN,
    average_rating DECIMAL,
    review_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price,
        p.category,
        p.image_url,
        p.stock,
        p.is_active,
        p.featured,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count,
        p.created_at
    FROM products p
    LEFT JOIN reviews r ON p.id = r.product_id AND r.is_approved = true
    WHERE p.is_active = true
      AND (search_query IS NULL OR (
          p.name ILIKE '%' || search_query || '%' OR
          p.description ILIKE '%' || search_query || '%' OR
          p.category ILIKE '%' || search_query || '%'
      ))
      AND (category_filter IS NULL OR p.category = category_filter)
      AND (min_price IS NULL OR p.price >= min_price)
      AND (max_price IS NULL OR p.price <= max_price)
    GROUP BY p.id, p.name, p.slug, p.description, p.price, p.category, 
             p.image_url, p.stock, p.is_active, p.featured, p.created_at
    ORDER BY 
        CASE WHEN sort_by = 'name' AND sort_direction = 'asc' THEN p.name END ASC,
        CASE WHEN sort_by = 'name' AND sort_direction = 'desc' THEN p.name END DESC,
        CASE WHEN sort_by = 'price' AND sort_direction = 'asc' THEN p.price END ASC,
        CASE WHEN sort_by = 'price' AND sort_direction = 'desc' THEN p.price END DESC,
        CASE WHEN sort_by = 'rating' AND sort_direction = 'asc' THEN COALESCE(AVG(r.rating), 0) END ASC,
        CASE WHEN sort_by = 'rating' AND sort_direction = 'desc' THEN COALESCE(AVG(r.rating), 0) END DESC,
        CASE WHEN sort_by = 'created_at' AND sort_direction = 'asc' THEN p.created_at END ASC,
        CASE WHEN sort_by = 'created_at' AND sort_direction = 'desc' THEN p.created_at END DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- ===== FUNZIONI PER LA GESTIONE DEGLI INDIRIZZI =====

-- Funzione per impostare un indirizzo come predefinito
CREATE OR REPLACE FUNCTION set_default_address(
    address_id UUID,
    user_id UUID,
    address_type TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    -- Rimuovi il flag default da tutti gli indirizzi dello stesso tipo dell'utente
    UPDATE addresses
    SET is_default = false,
        updated_at = NOW()
    WHERE user_id = set_default_address.user_id 
      AND type = address_type;
    
    -- Imposta il nuovo indirizzo come predefinito
    UPDATE addresses
    SET is_default = true,
        updated_at = NOW()
    WHERE id = address_id 
      AND user_id = set_default_address.user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Address not found or does not belong to user';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ===== FUNZIONI PER LA GESTIONE DELLE RECENSIONI =====

-- Funzione per verificare se un utente può recensire un prodotto
CREATE OR REPLACE FUNCTION can_user_review_product(
    user_id UUID,
    product_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    order_count INTEGER;
    review_count INTEGER;
BEGIN
    -- Verifica se l'utente ha acquistato il prodotto
    SELECT COUNT(*) INTO order_count
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = can_user_review_product.user_id
      AND oi.product_id = can_user_review_product.product_id
      AND o.status IN ('completato', 'spedito');
    
    -- Verifica se ha già recensito il prodotto
    SELECT COUNT(*) INTO review_count
    FROM reviews
    WHERE user_id = can_user_review_product.user_id
      AND product_id = can_user_review_product.product_id;
    
    RETURN order_count > 0 AND review_count = 0;
END;
$$ LANGUAGE plpgsql;

-- ===== FUNZIONI PER LA GESTIONE DEL CARRELLO =====

-- Funzione per sincronizzare il carrello di un utente
CREATE OR REPLACE FUNCTION sync_user_cart(
    user_id UUID,
    cart_items JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    cart_id UUID;
    item JSONB;
BEGIN
    -- Trova o crea il carrello dell'utente
    SELECT id INTO cart_id
    FROM carts
    WHERE user_id = sync_user_cart.user_id;
    
    IF NOT FOUND THEN
        INSERT INTO carts (user_id)
        VALUES (user_id)
        RETURNING id INTO cart_id;
    END IF;
    
    -- Cancella tutti gli elementi esistenti
    DELETE FROM cart_items WHERE cart_id = cart_id;
    
    -- Inserisci i nuovi elementi
    FOR item IN SELECT * FROM jsonb_array_elements(cart_items)
    LOOP
        INSERT INTO cart_items (cart_id, product_id, quantity)
        VALUES (
            cart_id,
            (item->>'product_id')::UUID,
            (item->>'quantity')::INTEGER
        );
    END LOOP;
    
    -- Aggiorna la data di modifica del carrello
    UPDATE carts
    SET updated_at = NOW()
    WHERE id = cart_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ===== FUNZIONI PER L'ANALISI =====

-- Funzione per ottenere i prodotti più venduti
CREATE OR REPLACE FUNCTION get_best_selling_products(
    limit_count INTEGER DEFAULT 10,
    days_back INTEGER DEFAULT 30
) RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    total_quantity_sold BIGINT,
    total_revenue DECIMAL,
    order_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oi.product_id,
        p.name as product_name,
        SUM(oi.quantity) as total_quantity_sold,
        SUM(oi.total_price) as total_revenue,
        COUNT(DISTINCT oi.order_id) as order_count
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.created_at >= NOW() - INTERVAL '1 day' * days_back
      AND o.status IN ('completato', 'spedito')
    GROUP BY oi.product_id, p.name
    ORDER BY total_quantity_sold DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ===== TRIGGER PER L'AUTOMATIZZAZIONE =====

-- Trigger per aggiornare automaticamente lo stock quando viene cancellato un ordine
CREATE OR REPLACE FUNCTION handle_order_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    -- Se l'ordine è stato cancellato, ripristina lo stock
    IF OLD.status != 'cancellato' AND NEW.status = 'cancellato' THEN
        -- Ripristina lo stock per ogni elemento dell'ordine
        UPDATE products
        SET stock = stock + oi.quantity
        FROM order_items oi
        WHERE products.id = oi.product_id
          AND oi.order_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_cancellation_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_cancellation();

-- ===== INDICI PER PERFORMANCE =====

-- Indici aggiuntivi per le funzioni di ricerca
CREATE INDEX IF NOT EXISTS idx_products_name_search ON products USING gin(to_tsvector('italian', name));
CREATE INDEX IF NOT EXISTS idx_products_description_search ON products USING gin(to_tsvector('italian', description));
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_orders_created_at_status ON orders(created_at, status);
CREATE INDEX IF NOT EXISTS idx_order_items_product_order ON order_items(product_id, order_id);
