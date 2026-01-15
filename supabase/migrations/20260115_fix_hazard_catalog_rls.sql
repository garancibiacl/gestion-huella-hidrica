-- Fix RLS policies para permitir upsert en catálogos de hazards

-- Política para INSERT en hazard_catalog_hierarchy
DROP POLICY IF EXISTS "Users can insert hierarchy in their org" ON hazard_catalog_hierarchy;
CREATE POLICY "Users can insert hierarchy in their org" 
  ON hazard_catalog_hierarchy
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.organization_id = hazard_catalog_hierarchy.organization_id
    )
  );

-- Política para UPDATE en hazard_catalog_hierarchy
DROP POLICY IF EXISTS "Users can update hierarchy in their org" ON hazard_catalog_hierarchy;
CREATE POLICY "Users can update hierarchy in their org" 
  ON hazard_catalog_hierarchy
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.organization_id = hazard_catalog_hierarchy.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.organization_id = hazard_catalog_hierarchy.organization_id
    )
  );

-- Política para INSERT en hazard_critical_risks
DROP POLICY IF EXISTS "Users can insert risks in their org" ON hazard_critical_risks;
CREATE POLICY "Users can insert risks in their org" 
  ON hazard_critical_risks
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.organization_id = hazard_critical_risks.organization_id
    )
  );

-- Política para UPDATE en hazard_critical_risks
DROP POLICY IF EXISTS "Users can update risks in their org" ON hazard_critical_risks;
CREATE POLICY "Users can update risks in their org" 
  ON hazard_critical_risks
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.organization_id = hazard_critical_risks.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.organization_id = hazard_critical_risks.organization_id
    )
  );

-- Política para INSERT en hazard_responsibles
DROP POLICY IF EXISTS "Users can insert responsibles in their org" ON hazard_responsibles;
CREATE POLICY "Users can insert responsibles in their org" 
  ON hazard_responsibles
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.organization_id = hazard_responsibles.organization_id
    )
  );

-- Política para UPDATE en hazard_responsibles
DROP POLICY IF EXISTS "Users can update responsibles in their org" ON hazard_responsibles;
CREATE POLICY "Users can update responsibles in their org" 
  ON hazard_responsibles
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.organization_id = hazard_responsibles.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.organization_id = hazard_responsibles.organization_id
    )
  );
