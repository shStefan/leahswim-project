import React, { useState, useEffect } from 'react';
import { useDynamicTranslation } from '../context/TranslationContext';

interface TranslatedHTMLProps {
  htmlContent: string;
  className?: string;
}

/**
 * Component that translates HTML content dynamically for the English version
 * Extracts text from HTML, translates it, and reconstructs the HTML
 */
export const TranslatedHTML: React.FC<TranslatedHTMLProps> = ({ 
  htmlContent, 
  className = '' 
}) => {
  const { translate, isTranslating } = useDynamicTranslation();
  const [translatedHTML, setTranslatedHTML] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const translateHTML = async () => {
      setIsLoading(true);
      
      try {
        // Create a temporary div to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // Extract text nodes and translate them
        const textNodes = [];
        const walker = document.createTreeWalker(
          tempDiv,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        let node;
        while (node = walker.nextNode()) {
          if (node.textContent && node.textContent.trim()) {
            textNodes.push({
              node: node,
              originalText: node.textContent.trim()
            });
          }
        }
        
        // Translate all text nodes
        const translations = await Promise.all(
          textNodes.map(async ({ originalText }) => {
            const translated = await translate(originalText);
            return { originalText, translated };
          })
        );
        
        // Replace original text with translations
        translations.forEach(({ originalText, translated }) => {
          textNodes.forEach(({ node }) => {
            if (node.textContent && node.textContent.trim() === originalText) {
              node.textContent = translated;
            }
          });
        });
        
        setTranslatedHTML(tempDiv.innerHTML);
      } catch (error) {
        console.error('Error translating HTML:', error);
        // Fallback to original content if translation fails
        setTranslatedHTML(htmlContent);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (htmlContent) {
      translateHTML();
    }
  }, [htmlContent, translate]);

  if (isLoading || isTranslating) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: translatedHTML || htmlContent }} 
    />
  );
};