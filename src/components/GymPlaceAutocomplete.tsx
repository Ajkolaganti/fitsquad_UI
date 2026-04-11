"use client";

import { useEffect, useRef } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { isLikelyFitnessPlace } from "@/lib/google-places-fitness";

export type SelectedGymPlace = {
  placeId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
};

interface GymPlaceAutocompleteProps {
  apiKey: string;
  disabled?: boolean;
  onSelect: (place: SelectedGymPlace) => void;
  onValidationError: (message: string) => void;
  inputClassName?: string;
  placeholder?: string;
}

let placesLoadPromise: Promise<void> | null = null;

function ensurePlacesLoaded(key: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!placesLoadPromise) {
    placesLoadPromise = (async () => {
      setOptions({ key, v: "weekly" });
      await importLibrary("places");
    })();
  }
  return placesLoadPromise;
}

export function GymPlaceAutocomplete({
  apiKey,
  disabled,
  onSelect,
  onValidationError,
  inputClassName,
  placeholder = "Search for your gym…",
}: GymPlaceAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onSelectRef = useRef(onSelect);
  const onValidationErrorRef = useRef(onValidationError);

  onSelectRef.current = onSelect;
  onValidationErrorRef.current = onValidationError;

  useEffect(() => {
    const input = inputRef.current;
    if (!input || !apiKey.trim()) return;

    let ac: google.maps.places.Autocomplete | null = null;
    let cancelled = false;

    void (async () => {
      try {
        await ensurePlacesLoaded(apiKey.trim());
      } catch {
        onValidationErrorRef.current("Could not load Google Maps. Check your API key.");
        return;
      }
      if (cancelled || !inputRef.current) return;

      ac = new google.maps.places.Autocomplete(inputRef.current, {
        fields: ["place_id", "geometry", "name", "formatted_address", "types"],
        types: ["establishment"],
      });

      ac.addListener("place_changed", () => {
        const place = ac?.getPlace();
        if (!place?.place_id || !place.geometry?.location) {
          onValidationErrorRef.current("Choose a result from the list.");
          return;
        }
        if (!isLikelyFitnessPlace(place)) {
          onValidationErrorRef.current(
            "That doesn’t look like a gym or fitness studio in Google Maps. Try another search."
          );
          return;
        }
        onValidationErrorRef.current("");
        onSelectRef.current({
          placeId: place.place_id,
          name: place.name ?? "Gym",
          formattedAddress: place.formatted_address ?? "",
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      });
    })();

    return () => {
      cancelled = true;
      if (ac) {
        google.maps.event.clearInstanceListeners(ac);
        ac = null;
      }
    };
  }, [apiKey]);

  return (
    <input
      ref={inputRef}
      type="text"
      autoComplete="off"
      disabled={disabled}
      placeholder={placeholder}
      className={inputClassName}
      name="gym-place-search"
    />
  );
}
