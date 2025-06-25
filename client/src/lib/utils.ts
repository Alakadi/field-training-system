import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'غير محدد';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'تاريخ غير صحيح';
  }
}

export function getUserAvatarUrl(name: string): string {
  // Generate a simple avatar URL based on user name
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&size=32&format=svg&rounded=true`;
}