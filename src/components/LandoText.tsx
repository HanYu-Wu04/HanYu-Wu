import React, { useMemo } from 'react';

interface LandoTextProps {
  text: string;
  className?: string;
  delayOffset?: number;
  wholeLine?: boolean;
}

const LandoText: React.FC<LandoTextProps> = ({ text, className = '', delayOffset = 0, wholeLine = false }) => {
  const segments = useMemo(() => {
    if (wholeLine) {
      return [text];
    }
    try {
      // Safely split text by visual characters using Intl.Segmenter
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
      return Array.from(segmenter.segment(text)).map(s => s.segment);
    } catch (e) {
      // Fallback for environments without Intl.Segmenter
      return text.split('');
    }
  }, [text, wholeLine]);

  return (
    <span className={`inline-flex whitespace-pre ${className}`}>
      {segments.map((char, index) => {
        const displayChar = char === ' ' ? '\u00A0' : char;
        return (
          <span 
            key={index} 
            className="lando-link"
            style={{ '--index': index + delayOffset } as React.CSSProperties}
          >
            <span>{displayChar}</span>
            <span aria-hidden="true">{displayChar}</span>
          </span>
        );
      })}
    </span>
  );
};

export default LandoText;
