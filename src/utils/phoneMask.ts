// Phone number masking utility
// Supports international format with country code
import React from 'react';

export const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const cleaned = value.replace(/\D/g, '');
  
  // If empty, return empty
  if (!cleaned) return '';
  
  // If starts with country code and is long enough
  if (cleaned.length > 10) {
    // Format: +X (XXX) XXX-XX-XX for international numbers
    if (cleaned.length <= 12) {
      const countryCode = cleaned.slice(0, cleaned.length - 10);
      const number = cleaned.slice(-10);
      return `+${countryCode} (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6, 8)}-${number.slice(8)}`;
    }
    // For longer numbers, just format the last 10 digits
    const number = cleaned.slice(-10);
    return `+${cleaned.slice(0, -10)} (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6, 8)}-${number.slice(8)}`;
  }
  
  // Format: (XXX) XXX-XX-XX for 10-digit numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8)}`;
  }
  
  // Format: (XXX) XXX-XX for 8-9 digit numbers
  if (cleaned.length >= 8) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Format: (XXX) XXX for 6-7 digit numbers
  if (cleaned.length >= 6) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  }
  
  // Format: (XXX for 3-5 digit numbers
  if (cleaned.length >= 3) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  }
  
  // Just add opening parenthesis for 1-2 digits
  return cleaned.length > 0 ? `(${cleaned}` : '';
};

export const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>, setValue: (value: string) => void): void => {
  const input = e.target.value;
  const formatted = formatPhoneNumber(input);
  setValue(formatted);
};

// Get clean phone number (digits only) for submission
export const getCleanPhoneNumber = (formattedPhone: string): string => {
  return formattedPhone.replace(/\D/g, '');
};

