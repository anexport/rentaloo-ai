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
    if (!["es", "fr", "de"].includes(targetLang)) {
      return new Response(
        JSON.stringify({ error: "Unsupported language. Use: es, fr, de" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache first
    const { data: cachedTranslations } = await supabase
      .from("content_translations")
      .select("*")
      .eq("content_type", "equipment")
      .eq("content_id", equipmentId)
      .eq("target_lang", targetLang)
      .in("field_name", ["title", "description"]);

    const cachedTitle = cachedTranslations?.find((t) => t.field_name === "title");
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

    // Get original equipment data
    const { data: equipment, error: equipmentError } = await supabase
      .from("equipment")
      .select("title, description")
      .eq("id", equipmentId)
      .single();

    if (equipmentError || !equipment) {
      return new Response(
        JSON.stringify({ error: "Equipment not found" }),
        {
          status: 404,
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
        // Cache the translation
        await supabase.from("content_translations").upsert({
          content_type: "equipment",
          content_id: equipmentId,
          field_name: "title",
          source_lang: "en",
          target_lang: targetLang,
          original_text: equipment.title,
          translated_text: translatedTitle,
        });
      }
    } else {
      title = cachedTitle.translated_text;
    }

    // Translate description if not cached
    if (!cachedDescription) {
      const translatedDescription = await translateText(
        equipment.description,
        "en",
        targetLang,
        googleApiKey
      );
      if (translatedDescription) {
        description = translatedDescription;
        // Cache the translation
        await supabase.from("content_translations").upsert({
          content_type: "equipment",
          content_id: equipmentId,
          field_name: "description",
          source_lang: "en",
          target_lang: targetLang,
          original_text: equipment.description,
          translated_text: translatedDescription,
        });
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
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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

    const data = await response.json();
    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error("Translation error:", error);
    return null;
  }
}
