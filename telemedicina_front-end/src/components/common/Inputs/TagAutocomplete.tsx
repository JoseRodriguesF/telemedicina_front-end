"use client";
import React, { useMemo, useState, useRef, useEffect } from 'react';
import './input.css';

type Props = {
  placeholder?: string;
  suggestions: string[];
  selected: string[];
  onChangeSelected: (next: string[]) => void;
  className?: string;
};

export default function TagAutocomplete({ placeholder = 'Digite para procurar', suggestions, selected, onChangeSelected, className = '' }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? suggestions.filter(s => s.toLowerCase().includes(q)) : suggestions;
    return base.filter(s => !selected.includes(s)).slice(0, 8);
  }, [query, suggestions, selected]);

  function addTag(tag: string) {
    if (!selected.includes(tag)) onChangeSelected([...selected, tag]);
    setQuery('');
    setOpen(false);
  }

  function removeTag(tag: string) {
    onChangeSelected(selected.filter(t => t !== tag));
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className={`pc-tag-autocomplete ${className}`} ref={containerRef}>
      <input
        className="c-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        type="text"
      />

      {selected.length > 0 && (
        <div className="pc-chips" aria-live="polite">
          {selected.map(tag => (
            <button type="button" key={tag} className="pc-chip selected" onClick={() => removeTag(tag)}>
              {tag}
              <span className="pc-chip-action" aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}

      {open && filtered.length > 0 && (
        <div className="pc-suggest-list" role="listbox">
          {filtered.map(s => (
            <button type="button" key={s} className="pc-suggest-item" onClick={() => addTag(s)} role="option">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
