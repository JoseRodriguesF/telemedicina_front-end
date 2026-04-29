'use client';
import { useEffect, useRef } from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onPlaceSelected?: (payload: { 
    description: string; 
    placeId: string;
    components?: {
      street_number?: string;
      route?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      zip?: string;
    }
  }) => void;
  placeholder?: string;
  className?: string;
};

export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder = 'Digite o endereço',
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return;

    function init() {
      if (isInitialized.current) return;
      const google = (window as any).google;
      if (!google?.maps?.places || !inputRef.current) return;

      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        fields: ['place_id', 'formatted_address', 'address_components', 'geometry'],
        componentRestrictions: { country: ['br'] },
      });

      isInitialized.current = true;

      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        const description = place.formatted_address || '';
        
        // Use a callback approach to ensure we don't need 'value' in the closure if possible,
        // but here we just need to call onChange with the new description.
        onChange(description);
        
        if (onPlaceSelected && place.place_id) {
          const comps: any = {};
          place.address_components?.forEach((c: any) => {
            if (c.types.includes('street_number')) comps.street_number = c.long_name;
            if (c.types.includes('route')) comps.route = c.long_name;
            if (c.types.includes('sublocality_level_1') || c.types.includes('neighborhood')) comps.neighborhood = c.long_name;
            if (c.types.includes('administrative_area_level_2') || c.types.includes('locality')) comps.city = c.long_name;
            if (c.types.includes('administrative_area_level_1')) comps.state = c.short_name;
            if (c.types.includes('postal_code')) comps.zip = c.long_name;
          });

          onPlaceSelected({ 
            description: description, 
            placeId: place.place_id,
            components: comps
          });
        }
      });
    }

    // Load script if not loaded
    if ((window as any).google?.maps?.places) {
      init();
    } else {
      const existing = document.querySelector('script[data-google-maps]');
      if (existing) {
        existing.addEventListener('load', init as any);
      } else {
        const s = document.createElement('script');
        s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&language=pt-BR&region=BR&loading=async`;
        s.async = true;
        s.defer = true;
        s.setAttribute('data-google-maps', '1');
        s.onload = init;
        document.head.appendChild(s);
      }
    }
  }, []); // Run once on mount

  return (
    <input
      ref={inputRef}
      className={className || 'c-input'}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type="text"
      autoComplete="off"
      data-lpignore="true"
      data-form-type="other"
      spellCheck="false"
    />
  );
}
