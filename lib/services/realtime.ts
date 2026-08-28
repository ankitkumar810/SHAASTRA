import { createClient } from "@/lib/supabase/client";

export function subscribeToShelterUpdates(shelterId: string, onUpdate: (payload: any) => void) {
  const supabase = createClient();

  const channel = supabase
    .channel(`shelter-realtime-${shelterId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "Shelter",
        filter: `id=eq.${shelterId}`,
      },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToDistrictShelters(districtId: string, onUpdate: (payload: any) => void) {
  const supabase = createClient();

  const channel = supabase
    .channel(`district-shelters-${districtId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "Shelter",
      },
      (payload) => {
        onUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
