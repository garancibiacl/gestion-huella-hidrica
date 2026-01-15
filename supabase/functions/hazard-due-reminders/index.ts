import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HazardReport {
  id: string;
  organization_id: string;
  description: string;
  due_date: string;
  closing_responsible_id: string | null;
  status: string;
}

interface HazardResponsible {
  id: string;
  email: string | null;
}

interface Profile {
  user_id: string;
  email: string | null;
  organization_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Starting hazard due reminders check...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date and calculate threshold (48 hours from now)
    const now = new Date();
    const dueSoonThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours
    const overdueThreshold = now;

    console.log(`Checking for reports due before: ${dueSoonThreshold.toISOString()}`);
    console.log(`Overdue threshold: ${overdueThreshold.toISOString()}`);

    // Get open hazard reports that are approaching due date or overdue
    const { data: reports, error: reportsError } = await supabase
      .from("hazard_reports")
      .select("id, organization_id, description, due_date, closing_responsible_id, status")
      .eq("status", "OPEN")
      .lte("due_date", dueSoonThreshold.toISOString().split("T")[0])
      .returns<HazardReport[]>();

    if (reportsError) {
      console.error("Error fetching hazard reports:", reportsError);
      throw reportsError;
    }

    console.log(`Found ${reports?.length || 0} reports to check`);

    if (!reports || reports.length === 0) {
      return new Response(
        JSON.stringify({ message: "No reports approaching due date", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let notificationsCreated = 0;
    let notificationsSkipped = 0;

    for (const report of reports) {
      if (!report.closing_responsible_id) {
        console.log(`Report ${report.id} has no closing responsible, skipping`);
        notificationsSkipped++;
        continue;
      }

      // Determine notification type based on due date
      const dueDate = new Date(report.due_date);
      const isOverdue = dueDate < overdueThreshold;
      const notificationType = isOverdue ? "report_overdue" : "report_due_soon";

      // Check if notification already exists for this report and type (avoid duplicates)
      const { data: existingNotif, error: existingError } = await supabase
        .from("hazard_notifications")
        .select("id")
        .eq("hazard_report_id", report.id)
        .eq("type", notificationType)
        .limit(1);

      if (existingError) {
        console.error(`Error checking existing notification for ${report.id}:`, existingError);
        continue;
      }

      if (existingNotif && existingNotif.length > 0) {
        console.log(`Notification ${notificationType} already exists for report ${report.id}, skipping`);
        notificationsSkipped++;
        continue;
      }

      // Get the responsible's email to find their user_id
      const { data: responsible, error: respError } = await supabase
        .from("hazard_responsibles")
        .select("id, email")
        .eq("id", report.closing_responsible_id)
        .single<HazardResponsible>();

      if (respError || !responsible?.email) {
        console.log(`Could not find responsible email for report ${report.id}`);
        notificationsSkipped++;
        continue;
      }

      // Find user_id by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, email, organization_id")
        .ilike("email", responsible.email.trim())
        .eq("organization_id", report.organization_id)
        .single<Profile>();

      if (profileError || !profile) {
        console.log(`Could not find profile for email ${responsible.email}`);
        notificationsSkipped++;
        continue;
      }

      // Create the notification
      const title = isOverdue
        ? "⚠️ Reporte de Peligro VENCIDO"
        : "⏰ Reporte de Peligro próximo a vencer";

      const message = isOverdue
        ? `El reporte ha superado su fecha límite (${report.due_date}): ${report.description.substring(0, 80)}...`
        : `El reporte vence el ${report.due_date}: ${report.description.substring(0, 80)}...`;

      const { error: insertError } = await supabase.from("hazard_notifications").insert({
        organization_id: report.organization_id,
        user_id: profile.user_id,
        hazard_report_id: report.id,
        type: notificationType,
        title,
        message,
      });

      if (insertError) {
        console.error(`Error creating notification for report ${report.id}:`, insertError);
        continue;
      }

      console.log(`Created ${notificationType} notification for report ${report.id}`);
      notificationsCreated++;
    }

    const result = {
      message: "Hazard due reminders check completed",
      reportsChecked: reports.length,
      notificationsCreated,
      notificationsSkipped,
    };

    console.log("Result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in hazard-due-reminders:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
