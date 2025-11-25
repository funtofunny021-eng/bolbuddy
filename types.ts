export enum AppScreen {
  ONBOARDING_WELCOME = 'ONBOARDING_WELCOME',
  ONBOARDING_PROFILE = 'ONBOARDING_PROFILE',
  DASHBOARD = 'DASHBOARD',
  PARENTS = 'PARENTS',
}

export enum Gender {
  BOY = 'Boy',
  GIRL = 'Girl',
  PREFER_NOT = 'Prefer not to say',
}

export enum LanguageGoal {
  LEARN_ENGLISH = 'Learn English', // Urdu to English
  LEARN_URDU = 'Learn Urdu', // English to Urdu
}

export interface UserProfile {
  name: string;
  age: number;
  gender: Gender;
  parentPhone: string;
  languageGoal: LanguageGoal | null;
}

export interface IslandData {
  id: number;
  title: string;
  description: string;
  color: string; // Tailwind color class base
  icon: string; // Emoji or Icon Name
  unlocked: boolean;
  totalLevels: number;
  completedLevels: number;
}