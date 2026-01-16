-- Agregar política INSERT para notification_email_settings
CREATE POLICY "Admins can insert their org email settings"
  ON notification_email_settings FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

-- Política para service_role en notification_outbox (para el edge function dispatcher)
-- El outbox solo debe ser accedido por service_role, no por usuarios autenticados