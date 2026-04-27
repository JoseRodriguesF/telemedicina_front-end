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

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return;

    function init() {
      const google = (window as any).google;
      if (!google?.maps?.places || !inputRef.current) return;

      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        fields: ['place_id', 'formatted_address', 'address_components', 'geometry'],
        componentRestrictions: { country: ['br'] },
      });

      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        const description = place.formatted_address || value;
        onChange(description || '');
        
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
            description: description || '', 
            placeId: place.place_id,
            components: comps
          });
        }
      });
    }

    // Load script if not loaded
    if ((window as any).google?.maps?.places) {
      init();
      return;
    }
    const existing = document.querySelector('script[data-google-maps]');
    if (existing) {
      existing.addEventListener('load', init as any);
      return;
    }
    const s = document.createElement('script');
    // Recommended pattern adds loading=async for optimal performance
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&language=pt-BR&region=BR&loading=async`;
    s.async = true;
    s.defer = true;
    s.setAttribute('data-google-maps', '1');
    s.onload = init;
    document.head.appendChild(s);
  }, [value, onChange, onPlaceSelected]);

  return (
    <input
      ref={inputRef}
      className={className || 'c-input'}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type="text"
      autoComplete="off"
      data-lpignore="true" // LastPass ignore
      data-form-type="other"
      spellCheck="false"
    />
  );
}
