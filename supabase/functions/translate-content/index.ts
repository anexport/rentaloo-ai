import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { equipmentId, targetLang } = await req.json();

    // Validate input
    if (!equipmentId || !targetLang) {
      return new Response(
        JSON.stringify({ error: "equipmentId and targetLang are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate language
    if (!["es", "fr", "de", "it"].includes(targetLang)) {
      return new Response(
        JSON.stringify({ error: "Unsupported language. Use: es, fr, de, it" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error("Supabase credentials not configured");
      return new Response(
        JSON.stringify({ error: "Translation service misconfigured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract JWT from Authorization header if provided (anonymous users won't have one)
    const authHeader = req.headers.get("Authorization");
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

    // Create client that respects RLS using anon role by default, or the user's JWT when available
    const supabaseRls = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    });

    // Try to fetch equipment with an RLS-respecting client (anon or authenticated)
    // This ensures users only translate equipment they can access
    const { data: equipment, error: equipmentError } = await supabaseRls
      .from("equipment")
      .select("title, description, owner_id, is_available")
      .eq("id", equipmentId)
      .single();

    if (equipmentError || !equipment) {
      return new Response(
        JSON.stringify({
          error: "Equipment not found or you don't have access to it",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use service role client only for cache operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache first
    const { data: cachedTranslations } = await supabaseService
      .from("content_translations")
      .select("*")
      .eq("content_type", "equipment")
      .eq("content_id", equipmentId)
      .eq("target_lang", targetLang)
      .in("field_name", ["title", "description"]);

    const cachedTitle = cachedTranslations?.find(
      (t) => t.field_name === "title"
    );
    const cachedDescription = cachedTranslations?.find(
      (t) => t.field_name === "description"
    );

    // If both are cached, return immediately
    if (cachedTitle && cachedDescription) {
      return new Response(
        JSON.stringify({
          title: cachedTitle.translated_text,
          description: cachedDescription.translated_text,
          fromCache: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const googleApiKey = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");
    if (!googleApiKey) {
      console.error("GOOGLE_TRANSLATE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Translation service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let title = equipment.title;
    let description = equipment.description;

    // Translate title if not cached
    if (!cachedTitle) {
      const translatedTitle = await translateText(
        equipment.title,
        "en",
        targetLang,
        googleApiKey
      );
      if (translatedTitle) {
        title = translatedTitle;
        // Cache the translation (service role needed for insert)
        const { error: cacheError } = await supabaseService
          .from("content_translations")
          .upsert({
            content_type: "equipment",
            content_id: equipmentId,
            field_name: "title",
            source_lang: "en",
            target_lang: targetLang,
            original_text: equipment.title,
            translated_text: translatedTitle,
          });

        if (cacheError) {
          console.error("Failed to cache translated title:", cacheError);
        }
      }
    } else {
      title = cachedTitle.translated_text;
    }

    // Translate description if not cached
    if (!cachedDescription) {
      let translatedDescription: string | null = "";

      if (equipment.description) {
        translatedDescription = await translateText(
          equipment.description,
          "en",
          targetLang,
          googleApiKey
        );
      }

      if (translatedDescription) {
        description = translatedDescription;
        // Cache the translation (service role needed for insert)
        const { error: cacheError } = await supabaseService
          .from("content_translations")
          .upsert({
            content_type: "equipment",
            content_id: equipmentId,
            field_name: "description",
            source_lang: "en",
            target_lang: targetLang,
            original_text: equipment.description,
            translated_text: translatedDescription,
          });

        if (cacheError) {
          console.error("Failed to cache translated description:", cacheError);
        }
      }
    } else {
      description = cachedDescription.translated_text;
    }

    return new Response(
      JSON.stringify({
        title,
        description,
        fromCache: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: "text",
        }),
      }
    );

    if (!response.ok) {
      console.error("Translation API error:", await response.text());
      return null;
    }

    let data: unknown;

    try {
      data = await response.json();
    } catch (error) {
      console.error("Failed to parse translation API response as JSON:", error);
      return null;
    }

    const translations = (
      data as { data?: { translations?: Array<{ translatedText?: unknown }> } }
    ).data?.translations;

    if (
      !translations ||
      !Array.isArray(translations) ||
      translations.length === 0 ||
      typeof translations[0]?.translatedText !== "string"
    ) {
      console.error("Unexpected translation API response shape:", data);
      return null;
    }

    return translations[0].translatedText;
  } catch (error) {
    console.error("Translation error:", error);
    return null;
  }
}
