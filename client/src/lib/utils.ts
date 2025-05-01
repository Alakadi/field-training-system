import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to localized string in Arabic
export function formatDate(date: Date | string): string {
  if (!date) return '';
  
  const d = new Date(date);
  
  return d.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// Convert Excel date serial number to JS Date object
export function excelDateToJSDate(serial: number): Date {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  
  const fractionalDay = serial - Math.floor(serial) + 0.0000001;
  let totalSeconds = Math.floor(86400 * fractionalDay);
  
  const seconds = totalSeconds % 60;
  totalSeconds -= seconds;
  
  const hours = Math.floor(totalSeconds / (60 * 60));
  const minutes = Math.floor(totalSeconds / 60) % 60;
  
  return new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate(), hours, minutes, seconds);
}

// Generate random placeholder for university logo
export function getUniversityLogoUrl(): string {
  return "https://picsum.photos/seed/university/120/120";
}

// Generate random placeholder for user avatar
export function getUserAvatarUrl(userId: string | number): string {
  return `https://picsum.photos/seed/user${userId}/40/40`;
}
