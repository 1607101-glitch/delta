import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  latex?: string;
  math?: string;
  inline?: boolean;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  latex,
  math,
  inline = false,
  className = '',
}) => {
  const content = latex || math || '';

  const html = useMemo(() => {
    if (!content.trim()) return '';
    try {
      // Clean potential double dollars or backticks if wrapped
      let cleaned = content.trim();
      if (cleaned.startsWith('$$') && cleaned.endsWith('$$')) {
        cleaned = cleaned.slice(2, -2).trim();
      } else if (cleaned.startsWith('$') && cleaned.endsWith('$')) {
        cleaned = cleaned.slice(1, -1).trim();
      }

      return katex.renderToString(cleaned, {
        displayMode: !inline,
        throwOnError: false,
        strict: false,
      });
    } catch (e) {
      console.warn('KaTeX render error:', e);
      return `<span class="font-mono text-amber-300">${content}</span>`;
    }
  }, [content, inline]);

  if (!content) return null;

  return (
    <span
      className={`inline-block select-text ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
