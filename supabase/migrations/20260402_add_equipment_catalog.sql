-- Equipment Catalog for AI-powered equipment management
-- Stores reusable equipment templates per company for memory/reuse feature

-- Create equipment catalog table
CREATE TABLE IF NOT EXISTS public.equipment_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    equipment_type TEXT NOT NULL,
    default_quantity INTEGER DEFAULT 1,
    default_hours NUMERIC(5,1) DEFAULT 8.0,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, equipment_type)
);

-- Add comment for documentation
COMMENT ON TABLE public.equipment_catalog IS 'Company-specific equipment catalog for AI-powered equipment entry and reuse';
COMMENT ON COLUMN public.equipment_catalog.equipment_type IS 'Name/type of equipment (e.g., 30t Excavator, Concrete Mixer)';
COMMENT ON COLUMN public.equipment_catalog.default_quantity IS 'Default quantity when adding to diary';
COMMENT ON COLUMN public.equipment_catalog.default_hours IS 'Default hours when adding to diary';
COMMENT ON COLUMN public.equipment_catalog.category IS 'Optional category for grouping (e.g., Plant, Tools, Vehicles)';

-- Enable RLS
ALTER TABLE public.equipment_catalog ENABLE ROW LEVEL SECURITY;

-- RLS Policies for equipment_catalog
CREATE POLICY "Allow company members to view equipment catalog" 
    ON public.equipment_catalog FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.company_memberships 
            WHERE company_id = equipment_catalog.company_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Allow company admins/editors to manage equipment catalog" 
    ON public.equipment_catalog FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.company_memberships 
            WHERE company_id = equipment_catalog.company_id 
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin', 'manager')
        )
    );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_company_id 
    ON public.equipment_catalog(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_type 
    ON public.equipment_catalog(equipment_type);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_equipment_catalog_updated_at
    BEFORE UPDATE ON public.equipment_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to upsert equipment from diary entries (memory feature)
CREATE OR REPLACE FUNCTION upsert_equipment_catalog_from_diary()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update equipment catalog entry when equipment is added to diary
    INSERT INTO public.equipment_catalog (company_id, equipment_type, default_quantity, default_hours)
    SELECT 
        d.company_id,
        NEW.equipment_type,
        NEW.quantity,
        NEW.hours_used
    FROM public.site_diaries d
    WHERE d.id = NEW.diary_id
    ON CONFLICT (company_id, equipment_type) 
    DO UPDATE SET
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically populate equipment catalog from new entries
CREATE TRIGGER auto_populate_equipment_catalog
    AFTER INSERT ON public.site_diary_equipment
    FOR EACH ROW
    EXECUTE FUNCTION upsert_equipment_catalog_from_diary();
