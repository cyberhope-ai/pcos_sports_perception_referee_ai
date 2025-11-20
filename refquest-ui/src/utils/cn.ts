/**
 * Class name utility using clsx and tailwind-merge
 * Combines class names and merges Tailwind classes intelligently
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
