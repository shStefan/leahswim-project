import React from 'react';
import { useTranslation, Language } from '../context/TranslationContext';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  className?: string;
  showIcon?: boolean;
  variant?: 'default' | 'compact' | 'mobile';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  className = '', 
  showIcon = true,
  variant = 'default'
}) => {
  // English-only version - hide language switcher
  return null;
};