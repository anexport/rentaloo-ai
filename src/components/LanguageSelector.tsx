import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

type Language = {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
};

const languages: Language[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
];

type LanguageSelectorProps = {
  variant?: "default" | "menu-item";
};

const LanguageSelector = ({ variant = "default" }: LanguageSelectorProps) => {
  const { i18n, t } = useTranslation();
  const { user } = useAuth();

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = async (languageCode: string) => {
    // Change language in i18n
    await i18n.changeLanguage(languageCode);

    // Save to localStorage
    localStorage.setItem("userLanguagePreference", languageCode);

    // If user is logged in, save to their metadata
    if (user) {
      try {
        const { error } = await supabase.auth.updateUser({
          data: {
            language_preference: languageCode,
          },
        });

        if (error) {
          console.error("Error saving language preference:", error);
        }
      } catch (err) {
        console.error("Error updating user metadata:", err);
      }
    }
  };

  if (variant === "menu-item") {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger
          className="gap-3"
          aria-label={t("common:language.select")}
        >
          <Globe className="h-4 w-4 text-gray-500" />
          <span className="text-sm">
            {currentLanguage.flag} {currentLanguage.nativeName}
          </span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent align="end" className="w-48">
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => {
                void handleLanguageChange(language.code);
              }}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{language.flag}</span>
                <span>{language.nativeName}</span>
              </span>
              {currentLanguage.code === language.code && (
                <Check className="h-4 w-4" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors"
        aria-label={t("common:language.select")}
      >
        <Globe className="h-4 w-4" />
        <span className="text-sm font-medium">
          {currentLanguage.flag} {currentLanguage.code.toUpperCase()}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
          {t("common:language.select")}
        </div>
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => {
              void handleLanguageChange(language.code);
            }}
            className="flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">{language.flag}</span>
              <div className="flex flex-col">
                <span className="font-medium">{language.nativeName}</span>
                <span className="text-xs text-muted-foreground">
                  {language.name}
                </span>
              </div>
            </span>
            {currentLanguage.code === language.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
