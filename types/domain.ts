export type ShelterStatus = "Open" | "Limited" | "Full";

export interface Shelter {
  id: string;
  name: string;
  area: string;
  availableBeds: number;
  totalBeds: number;
  food: string;
  medicine: string;
  status: ShelterStatus;
}

export interface SafeRecord {
  id: string;
  name: string;
  shelter: string;
  message: string;
}

export interface AlertItem {
  icon: string;
  title: string;
  description: string;
}

export interface ActivityItem {
  icon: string;
  description: string;
  time: string;
}
