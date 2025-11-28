'use client';
import { useEffect, useRef } from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onPlaceSelected?: (payload: { description: string; placeId?: string }) => void;
  placeholder?: string;
  className?: string;
  country?: string[]; // ISO 3166-1 Alpha-2 codes, e.g., ['br']
  type?: string; // e.g., 'address'
};

// Lightweight wrapper around <gmpx-api-loader> and <gmpx-place-picker>
export default function AddressPlacePicker({
  value,
  onChange,
  onPlaceSelected,
  placeholder = 'Digite o endereço',
  className,
  country = ['br'],
  type = 'address',
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pickerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Ensure the Extended Component Library script is loaded (module script)
    function loadLibrary() {
      return new Promise<void>((resolve, reject) => {
        if (customElements.get('gmpx-place-picker')) {
          resolve();
          return;
        }
        const existing = document.querySelector('script[data-gmpx]');
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject(new Error('Falha ao carregar Extended Component Library')));
          return;
        }
        const s = document.createElement('script');
        s.type = 'module';
        s.src = 'https://unpkg.com/@googlemaps/extended-component-library@0.6.14';
        s.setAttribute('data-gmpx', '1');
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Falha ao carregar Extended Component Library'));
        document.head.appendChild(s);
      });
    }

    async function mount() {
      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!key || !containerRef.current) return;
      await loadLibrary();

      // Clear container before mounting
      containerRef.current.innerHTML = '';

      // <gmpx-api-loader key="..." />
      const apiLoader = document.createElement('gmpx-api-loader') as HTMLElement & { key?: string };
      (apiLoader as any).key = key;
      containerRef.current.appendChild(apiLoader);

      // <gmpx-place-picker ... />
      const picker = document.createElement('gmpx-place-picker');
      if (placeholder) picker.setAttribute('placeholder', placeholder);
      if (country && country.length) picker.setAttribute('country', country.join(' '));
      if (type) picker.setAttribute('type', type);

      // Apply className to host for styling parity
      if (className) picker.className = className;

      // Listen for place changes
      const onPlaceChange = () => {
        const val: any = (picker as any).value; // Place | null | undefined
        if (val && typeof val === 'object') {
          const description: string = val.formattedAddress || '';
          const placeId: string | undefined = val.id;
          if (description) onChange(description);
          if (onPlaceSelected) onPlaceSelected({ description, placeId });
        } else if (val === null) {
          // No result for query
          if (onPlaceSelected) onPlaceSelected({ description: value || '', placeId: undefined });
        }
      };
      picker.addEventListener('gmpx-placechange', onPlaceChange);

      containerRef.current.appendChild(picker);
      pickerRef.current = picker;

      // Initialize visible text with controlled value
      try {
        const input: HTMLInputElement | null = (picker.shadowRoot?.querySelector('input') as HTMLInputElement) || null;
        if (input && value) input.value = value;
      } catch {}

      return () => {
        picker.removeEventListener('gmpx-placechange', onPlaceChange);
      };
    }

    const cleanupPromise = mount();
    return () => {
      // Nothing specific to clean up here beyond event listener handled above
      void cleanupPromise;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep input text in sync when parent value changes
  useEffect(() => {
    const picker = pickerRef.current as any;
    if (!picker) return;
    try {
      const input: HTMLInputElement | null = (picker.shadowRoot?.querySelector('input') as HTMLInputElement) || null;
      if (input && input.value !== value) {
        input.value = value || '';
      }
    } catch {}
  }, [value]);

  return <div ref={containerRef} />;
}
