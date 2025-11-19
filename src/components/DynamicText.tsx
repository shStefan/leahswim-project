import React, { useState, useEffect } from 'react';
import { useDynamicTranslation } from '../context/TranslationContext';

interface DynamicTextProps {
  text: string;
  className?: string;
  fallback?: string;
  tag?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'div';
}

export const DynamicText: React.FC<DynamicTextProps> = ({ 
  text, 
  className = '', 
  fallback,
  tag: Tag = 'span'
}) => {
  const { translate, isTranslating } = useDynamicTranslation();
  const [translatedText, setTranslatedText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const translateText = async () => {
      if (!text) return;
      
      setIsLoading(true);
      try {
        const translated = await translate(text);
        setTranslatedText(translated);
      } catch (error) {
        console.warn('Translation failed:', error);
        setTranslatedText(fallback || text);
      } finally {
        setIsLoading(false);
      }
    };

    translateText();
  }, [text, translate, fallback]);

  if (isLoading) {
    return (
      <Tag className={`${className} opacity-60 animate-pulse`}>
        {text}
      </Tag>
    );
  }

  return (
    <Tag className={className}>
      {translatedText}
    </Tag>
  );
}; 