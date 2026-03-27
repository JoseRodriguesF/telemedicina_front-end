import React from 'react';

interface AccordionProps {
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  isFilled?: boolean;
  isMissing?: boolean;
  children: React.ReactNode;
}

const Accordion: React.FC<AccordionProps> = ({ id, title, isOpen, onToggle, isFilled, isMissing, children }) => (
  <div className={`accordion-item ${isOpen ? 'open' : ''} ${isFilled ? 'is-filled' : ''} ${isMissing ? 'is-missing' : ''}`}>
    <button className="accordion-trigger" onClick={() => onToggle(id)} type="button">
      <span>{title}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
    <div className="accordion-content">
      {children}
    </div>
  </div>
);

export default Accordion;
