// Deepgram configuration
// In a production environment, you should store this in environment variables
// or a secure configuration system

// Function to get the appropriate model based on the language
const getModelForLanguage = (language: string): string => {
  // Use nova-2 for non-English languages, nova-3 for English
  return language === "en" ? "nova-3" : "nova-2";
};

// Function to get the transcription options based on the selected language
export const getTranscriptionOptions = (
  language: string = "en",
  sampleRate: number = 16000
) => {
  // Ensure language is a string and not a JSON string
  let cleanLanguage = language;

  // Handle potential JSON string (should not happen after our fix, but just in case)
  if (
    typeof language === "string" &&
    language.startsWith('"') &&
    language.endsWith('"')
  ) {
    try {
      cleanLanguage = JSON.parse(language);
    } catch (e) {
      console.error("Error parsing language in getTranscriptionOptions:", e);
    }
  }

  console.log("Using language for transcription:", cleanLanguage);

  return {
    model: getModelForLanguage(cleanLanguage),
    smart_format: true,
    language: cleanLanguage,
    encoding: "linear16",
    channels: 1,
    sample_rate: sampleRate,
    // non-audio
    interim_results: true,
  };
};

// Default configuration with English language
export const DEEPGRAM_CONFIG = {
  // Transcription options
  TRANSCRIPTION_OPTIONS: getTranscriptionOptions("en"),
};
