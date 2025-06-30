import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { TextPlugin } from 'gsap/TextPlugin';

gsap.registerPlugin(TextPlugin);

interface DynamicTextProps {
  texts: string[];
}

export const DynamicText: React.FC<DynamicTextProps> = ({ texts }) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const textElement = textRef.current;
    const cursorElement = cursorRef.current;
    if (!textElement || !cursorElement) return;

    // Enhanced cursor animation
    gsap.to(cursorElement, {
      opacity: 0,
      duration: 0.5,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut"
    });

    // Text animation timeline with enhanced effects
    const tl = gsap.timeline({ repeat: -1 });
    
    texts.forEach((text, index) => {
      // Fade out previous text
      tl.to(textElement, {
        duration: 0.4,
        opacity: 0,
        y: -20,
        ease: "back.in(1.7)",
        onComplete: () => {
          textElement.textContent = text;
        }
      })
      // Reveal new text with wave effect
      .to(textElement, {
        duration: 0.4,
        opacity: 1,
        y: 0,
        ease: "back.out(1.7)"
      })
      // Add wave effect to text
      .to(textElement, {
        duration: 2,
        ease: "none",
        onUpdate: () => {
          const progress = tl.progress();
          textElement.style.transform = `skewX(${Math.sin(progress * Math.PI * 2) * 2}deg)`;
        }
      });
    });

    return () => {
      tl.kill();
    };
  }, [texts]);

  return (
    <span className="relative inline-block min-w-[200px] text-center">
      <span
        ref={textRef}
        className="inline-block gradient-text"
      >
        {texts[0]}
      </span>
      <span
        ref={cursorRef}
        className="inline-block w-[3px] h-[1em] bg-primary ml-1 align-middle"
      />
    </span>
  );
};