-- Politiche RLS (Row Level Security) per l'ecommerce Miele d'Autore

-- ===== ABILITA RLS SU TUTTE LE TABELLE =====
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_coupons ENABLE ROW LEVEL SECURITY;

-- ===== FUNZIONI HELPER =====

-- Funzione per verificare se l'utente è admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per verificare se l'utente è il proprietario
CREATE OR REPLACE FUNCTION public.is_owner(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== PROFILES =====

-- Gli utenti possono vedere solo il proprio profilo
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Gli utenti possono aggiornare solo il proprio profilo
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Gli admin possono vedere tutti i profili
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_admin());

-- Gli admin possono aggiornare tutti i profili
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (public.is_admin());

-- ===== CATEGORIES =====

-- Tutti possono vedere le categorie attive
CREATE POLICY "Everyone can view active categories" ON public.categories
    FOR SELECT USING (is_active = true);

-- Solo gli admin possono gestire le categorie
CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL USING (public.is_admin());

-- ===== PRODUCTS =====

-- Tutti possono vedere i prodotti attivi
CREATE POLICY "Everyone can view active products" ON public.products
    FOR SELECT USING (is_active = true);

-- Solo gli admin possono gestire i prodotti
CREATE POLICY "Admins can manage products" ON public.products
    FOR ALL USING (public.is_admin());

-- ===== CARTS =====

-- Gli utenti possono gestire solo il proprio carrello
CREATE POLICY "Users can manage own cart" ON public.carts
    FOR ALL USING (public.is_owner(user_id));

-- Gli admin possono vedere tutti i carrelli
CREATE POLICY "Admins can view all carts" ON public.carts
    FOR SELECT USING (public.is_admin());

-- ===== CART_ITEMS =====

-- Gli utenti possono gestire solo gli elementi del proprio carrello
CREATE POLICY "Users can manage own cart items" ON public.cart_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.carts 
            WHERE id = cart_items.cart_id AND user_id = auth.uid()
        )
    );

-- Gli admin possono vedere tutti gli elementi del carrello
CREATE POLICY "Admins can view all cart items" ON public.cart_items
    FOR SELECT USING (public.is_admin());

-- ===== ADDRESSES =====

-- Gli utenti possono gestire solo i propri indirizzi
CREATE POLICY "Users can manage own addresses" ON public.addresses
    FOR ALL USING (public.is_owner(user_id));

-- Gli admin possono vedere tutti gli indirizzi
CREATE POLICY "Admins can view all addresses" ON public.addresses
    FOR SELECT USING (public.is_admin());

-- ===== ORDERS =====

-- Gli utenti possono vedere solo i propri ordini
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT USING (public.is_owner(user_id));

-- Gli utenti possono creare solo ordini per se stessi
CREATE POLICY "Users can create own orders" ON public.orders
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Gli admin possono gestire tutti gli ordini
CREATE POLICY "Admins can manage all orders" ON public.orders
    FOR ALL USING (public.is_admin());

-- ===== ORDER_ITEMS =====

-- Gli utenti possono vedere gli elementi dei propri ordini
CREATE POLICY "Users can view own order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = order_items.order_id AND user_id = auth.uid()
        )
    );

-- Gli utenti possono creare elementi ordine solo per i propri ordini
CREATE POLICY "Users can create own order items" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = order_items.order_id AND user_id = auth.uid()
        )
    );

-- Gli admin possono gestire tutti gli elementi degli ordini
CREATE POLICY "Admins can manage all order items" ON public.order_items
    FOR ALL USING (public.is_admin());

-- ===== REVIEWS =====

-- Tutti possono vedere le recensioni approvate
CREATE POLICY "Everyone can view approved reviews" ON public.reviews
    FOR SELECT USING (is_approved = true);

-- Gli utenti possono vedere le proprie recensioni (anche non approvate)
CREATE POLICY "Users can view own reviews" ON public.reviews
    FOR SELECT USING (public.is_owner(user_id));

-- Gli utenti possono creare recensioni solo per i propri ordini
CREATE POLICY "Users can create reviews for own orders" ON public.reviews
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = reviews.order_id AND user_id = auth.uid()
        )
    );

-- Gli utenti possono aggiornare solo le proprie recensioni non approvate
CREATE POLICY "Users can update own pending reviews" ON public.reviews
    FOR UPDATE USING (
        public.is_owner(user_id) AND is_approved = false
    );

-- Gli utenti possono eliminare solo le proprie recensioni non approvate
CREATE POLICY "Users can delete own pending reviews" ON public.reviews
    FOR DELETE USING (
        public.is_owner(user_id) AND is_approved = false
    );

-- Gli admin possono gestire tutte le recensioni
CREATE POLICY "Admins can manage all reviews" ON public.reviews
    FOR ALL USING (public.is_admin());

-- ===== WISHLISTS =====

-- Gli utenti possono gestire solo la propria lista desideri
CREATE POLICY "Users can manage own wishlist" ON public.wishlists
    FOR ALL USING (public.is_owner(user_id));

-- Gli admin possono vedere tutte le liste desideri
CREATE POLICY "Admins can view all wishlists" ON public.wishlists
    FOR SELECT USING (public.is_admin());

-- ===== COUPONS =====

-- Tutti possono vedere i coupon attivi e validi
CREATE POLICY "Everyone can view active valid coupons" ON public.coupons
    FOR SELECT USING (
        is_active = true AND 
        (valid_until IS NULL OR valid_until > NOW())
    );

-- Solo gli admin possono gestire i coupon
CREATE POLICY "Admins can manage coupons" ON public.coupons
    FOR ALL USING (public.is_admin());

-- ===== ORDER_COUPONS =====

-- Gli utenti possono vedere i coupon utilizzati nei propri ordini
CREATE POLICY "Users can view own order coupons" ON public.order_coupons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = order_coupons.order_id AND user_id = auth.uid()
        )
    );

-- Gli admin possono gestire tutti i coupon degli ordini
CREATE POLICY "Admins can manage all order coupons" ON public.order_coupons
    FOR ALL USING (public.is_admin());

-- ===== POLITICHE PER GLI UTENTI NON AUTENTICATI =====

-- Gli utenti non autenticati possono vedere solo prodotti e categorie pubbliche
-- (Questo è già coperto dalle politiche sopra)

-- ===== POLITICHE SPECIALI PER L'AI =====

-- Funzione per verificare se la richiesta proviene dall'AI
CREATE OR REPLACE FUNCTION public.is_ai_request()
RETURNS BOOLEAN AS $$
BEGIN
    -- Verifica se la richiesta proviene da una Edge Function autorizzata
    -- Questo dovrebbe essere configurato con un header speciale
    RETURN current_setting('request.jwt.claims', true)::json->>'role' = 'ai_service';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- L'AI può leggere le recensioni per la moderazione
CREATE POLICY "AI can read reviews for moderation" ON public.reviews
    FOR SELECT USING (public.is_ai_request());

-- L'AI può aggiornare lo stato di moderazione delle recensioni
CREATE POLICY "AI can update review moderation" ON public.reviews
    FOR UPDATE USING (public.is_ai_request());

-- ===== POLITICHE PER I WEBHOOK =====

-- Funzione per verificare se la richiesta proviene da un webhook autorizzato
CREATE OR REPLACE FUNCTION public.is_webhook_request()
RETURNS BOOLEAN AS $$
BEGIN
    -- Verifica se la richiesta proviene da una Edge Function autorizzata
    RETURN current_setting('request.jwt.claims', true)::json->>'role' = 'webhook_service';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- I webhook possono aggiornare lo stato degli ordini
CREATE POLICY "Webhooks can update order status" ON public.orders
    FOR UPDATE USING (public.is_webhook_request());

-- ===== GRANT PERMISSIONS =====

-- Concedi permessi di lettura pubblica per le tabelle necessarie
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.coupons TO anon, authenticated;

-- Concedi permessi di scrittura per gli utenti autenticati
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.carts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.wishlists TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.order_coupons TO authenticated;

-- Concedi permessi completi agli admin
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ===== VIEWS PUBBLICHE =====

-- View per i prodotti con statistiche delle recensioni
CREATE VIEW public.products_with_stats AS
SELECT 
    p.*,
    COALESCE(AVG(r.rating), 0) as average_rating,
    COUNT(r.id) as review_count,
    COUNT(CASE WHEN r.rating = 5 THEN 1 END) as five_star_count,
    COUNT(CASE WHEN r.rating = 4 THEN 1 END) as four_star_count,
    COUNT(CASE WHEN r.rating = 3 THEN 1 END) as three_star_count,
    COUNT(CASE WHEN r.rating = 2 THEN 1 END) as two_star_count,
    COUNT(CASE WHEN r.rating = 1 THEN 1 END) as one_star_count
FROM public.products p
LEFT JOIN public.reviews r ON p.id = r.product_id AND r.is_approved = true
WHERE p.is_active = true
GROUP BY p.id;

-- View per le recensioni pubbliche
CREATE VIEW public.public_reviews AS
SELECT 
    r.*,
    p.name as product_name,
    pr.first_name,
    pr.last_name
FROM public.reviews r
JOIN public.products p ON r.product_id = p.id
JOIN public.profiles pr ON r.user_id = pr.id
WHERE r.is_approved = true;

-- ===== SECURITY DEFINER FUNCTIONS =====

-- Funzione per ottenere le statistiche dei prodotti (solo per admin)
CREATE OR REPLACE FUNCTION public.get_product_stats(product_id UUID)
RETURNS JSONB AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    RETURN (
        SELECT jsonb_build_object(
            'total_orders', COUNT(DISTINCT oi.order_id),
            'total_quantity_sold', COALESCE(SUM(oi.quantity), 0),
            'total_revenue', COALESCE(SUM(oi.total_price), 0),
            'average_rating', COALESCE(AVG(r.rating), 0),
            'review_count', COUNT(r.id)
        )
        FROM public.order_items oi
        LEFT JOIN public.reviews r ON oi.product_id = r.product_id AND r.is_approved = true
        WHERE oi.product_id = get_product_stats.product_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per ottenere le statistiche dell'admin
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    RETURN (
        SELECT jsonb_build_object(
            'total_orders', COUNT(*),
            'total_revenue', COALESCE(SUM(total_price), 0),
            'total_customers', COUNT(DISTINCT user_id),
            'pending_orders', COUNT(CASE WHEN status = 'pending_payment' THEN 1 END),
            'completed_orders', COUNT(CASE WHEN status = 'completato' THEN 1 END),
            'average_order_value', COALESCE(AVG(total_price), 0)
        )
        FROM public.orders
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
