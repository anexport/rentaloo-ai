import { supabase } from "@/lib/supabase";

async function fetchOriginalContent(
  equipmentId: string
): Promise<{ title: string; description: string }> {
  const { data, error } = await supabase
    .from("equipment")
    .select("title, description")
    .eq("id", equipmentId)
    .single();

  if (error) {
    console.error("Error fetching original equipment content:", error);
    return { title: "", description: "" };
  }

  return {
    title: data?.title || "",
    description: data?.description || "",
  };
}

/**
 * Translate equipment content using Supabase Edge Function
 *
 * This function calls a secure server-side edge function that handles
 * Google Translate API calls. The API key is kept server-side and never
 * exposed to the client, preventing credential leaks and unauthorized usage.
 *
 * @param equipmentId - The equipment ID
 * @param targetLang - Target language code (en, es, fr, de, it)
 * @returns Translated equipment title and description
 */
export async function translateEquipmentContent(
  equipmentId: string,
  targetLang: string
): Promise<{ title: string; description: string }> {
  // If target language is English or not supported, fetch original
  if (targetLang === "en" || !["es", "fr", "de", "it"].includes(targetLang)) {
    return fetchOriginalContent(equipmentId);
  }

  try {
    // Call the secure edge function instead of directly calling Google Translate
    const { data, error } = await supabase.functions.invoke("translate-content", {
      body: {
        equipmentId,
        targetLang,
      },
    });

    if (error) {
      console.error("Translation edge function error:", error);
      // Fallback to original content
      return fetchOriginalContent(equipmentId);
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      console.error("Translation edge function returned invalid payload:", data);
      return fetchOriginalContent(equipmentId);
    }

    const title =
      typeof (data as { title?: unknown }).title === "string"
        ? (data as { title?: string }).title
        : "";
    const description =
      typeof (data as { description?: unknown }).description === "string"
        ? (data as { description?: string }).description
        : "";

    return {
      title,
      description,
    };
  } catch (error) {
    console.error("Translation error:", error);

    // Fallback to original content on error
    return fetchOriginalContent(equipmentId);
  }
}

/**
 * Clear translation cache for a specific equipment
 * Useful when equipment content is updated
 *
 * Note: This requires the user to own the equipment due to RLS policies
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
