import { supabase } from "@/lib/supabase";

type TranslationCache = {
  content_type: string;
  content_id: string;
  field_name: string;
  source_lang: string;
  target_lang: string;
  original_text: string;
  translated_text: string;
};

/**
 * Translate equipment content using Google Translate API with caching
 *
 * @param equipmentId - The equipment ID
 * @param targetLang - Target language code (en, es, fr, de)
 * @returns Translated equipment title and description
 */
export async function translateEquipmentContent(
  equipmentId: string,
  targetLang: string
): Promise<{ title: string; description: string }> {
  // If target language is English or not supported, fetch original
  if (targetLang === "en" || !["es", "fr", "de"].includes(targetLang)) {
    const { data: equipment } = await supabase
      .from("equipment")
      .select("title, description")
      .eq("id", equipmentId)
      .single();

    return {
      title: equipment?.title || "",
      description: equipment?.description || "",
    };
  }

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

  // Get original equipment data
  const { data: equipment } = await supabase
    .from("equipment")
    .select("title, description")
    .eq("id", equipmentId)
    .single();

  if (!equipment) {
    return { title: "", description: "" };
  }

  let title = equipment.title;
  let description = equipment.description;

  // Translate title if not cached
  if (!cachedTitle) {
    const translatedTitle = await translateText(
      equipment.title,
      "en",
      targetLang
    );
    if (translatedTitle) {
      title = translatedTitle;
      // Cache the translation
      await cacheTranslation({
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
      targetLang
    );
    if (translatedDescription) {
      description = translatedDescription;
      // Cache the translation
      await cacheTranslation({
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

  return { title, description };
}

/**
 * Translate text using Google Translate API
 *
 * NOTE: This function requires VITE_GOOGLE_TRANSLATE_API_KEY environment variable
 * To set it up:
 * 1. Get API key from Google Cloud Console
 * 2. Enable Cloud Translation API
 * 3. Add VITE_GOOGLE_TRANSLATE_API_KEY to your .env file
 *
 * @param text - Text to translate
 * @param sourceLang - Source language code
 * @param targetLang - Target language code
 * @returns Translated text or null if translation fails
 */
async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    console.warn(
      "Google Translate API key not found. Set VITE_GOOGLE_TRANSLATE_API_KEY in your .env file."
    );
    return null;
  }

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

/**
 * Cache a translation in the database
 */
async function cacheTranslation(translation: TranslationCache): Promise<void> {
  try {
    const { error } = await supabase
      .from("content_translations")
      .upsert(translation, {
        onConflict: "content_type,content_id,field_name,target_lang",
      });

    if (error) {
      console.error("Error caching translation:", error);
    }
  } catch (error) {
    console.error("Error caching translation:", error);
  }
}

/**
 * Clear translation cache for a specific equipment
 * Useful when equipment content is updated
 */
export async function clearEquipmentTranslationCache(
  equipmentId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("content_translations")
      .delete()
      .eq("content_type", "equipment")
      .eq("content_id", equipmentId);

    if (error) {
      console.error("Error clearing translation cache:", error);
    }
  } catch (error) {
    console.error("Error clearing translation cache:", error);
  }
}
