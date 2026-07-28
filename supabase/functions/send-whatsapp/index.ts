import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "supervisor"].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin or supervisor role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { phone, message, type } = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "phone and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiUrl = Deno.env.get("WHATSAPP_API_URL") || "https://graph.facebook.com/v25.0";
    const token = Deno.env.get("WHATSAPP_API_TOKEN");
    const phoneId = Deno.env.get("WHATSAPP_PHONE_ID");

    if (!token || !phoneId) {
      return new Response(
        JSON.stringify({ error: "WhatsApp not configured on server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let digits = phone.replace(/\D/g, "");
    if (digits.startsWith("0")) digits = "249" + digits.slice(1);
    if (!digits.startsWith("249")) digits = "249" + digits;

    const msgType = type || "text";

    let body: Record<string, unknown>;
    if (msgType === "template") {
      body = {
        messaging_product: "whatsapp",
        to: digits,
        type: "template",
        template: {
          name: "hello_world",
          language: { code: "en_US" },
        },
      };
    } else {
      body = {
        messaging_product: "whatsapp",
        to: digits,
        type: "text",
        text: { body: message },
      };
    }

    const res = await fetch(`${apiUrl}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    console.log("WhatsApp API response:", JSON.stringify({ status: res.status, data }));

    if (res.ok && data.messages?.[0]?.id) {
      return new Response(
        JSON.stringify({ success: true, id: data.messages[0].id, type: msgType }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: data.error?.message || "send_failed", raw: data }),
      { status: res.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
