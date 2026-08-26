import type { ActivityItem, AlertItem, SafeRecord, Shelter } from "@/types/domain";

export const demoShelters: Shelter[] = [
  { id: "st-teresas", name: "St. Teresa's Relief Centre", area: "Ernakulam North - 1.2 km", availableBeds: 72, totalBeds: 110, food: "Food 3 days", medicine: "Medicine ready", status: "Open" },
  { id: "kalamassery-hall", name: "Kalamassery Community Hall", area: "Kalamassery - 3.8 km", availableBeds: 18, totalBeds: 150, food: "Food 1 day", medicine: "Medicine low", status: "Limited" },
  { id: "aluva-hall", name: "Aluva Town Hall", area: "Aluva - 5.4 km", availableBeds: 94, totalBeds: 120, food: "Food 4 days", medicine: "Medicine ready", status: "Open" },
  { id: "edappally-school", name: "Edappally School Shelter", area: "Edappally - 4.1 km", availableBeds: 0, totalBeds: 85, food: "Food 2 days", medicine: "Medicine ready", status: "Full" },
];

export const demoPeople: SafeRecord[] = [
  { id: "ananya-nair", name: "Ananya Nair", shelter: "St. Teresa's Relief Centre", message: "I am with my sister and safe." },
  { id: "ravi-kumar", name: "Ravi Kumar", shelter: "Aluva Town Hall", message: "Safe and awaiting transport." },
  { id: "meera-joseph", name: "Meera Joseph", shelter: "Kalamassery Community Hall", message: "Safe. Please do not worry." },
];

export const demoAlerts: AlertItem[] = [
  { icon: "⚠", title: "Medicine stock is low", description: "Kalamassery Community Hall has less than 24 hours of essential medicine." },
  { icon: "◒", title: "Shelter approaching capacity", description: "St. Teresa's Relief Centre is at 35% available beds." },
  { icon: "⚑", title: "Supply confirmation overdue", description: "Edappally School Shelter has not updated food stock for 6 hours." },
];

export const demoActivity: ActivityItem[] = [
  { icon: "✓", description: "Ananya Nair marked safe at St. Teresa's Relief Centre", time: "2 min ago" },
  { icon: "⌂", description: "Aluva Town Hall updated capacity: 94 beds available", time: "12 min ago" },
  { icon: "⚑", description: "Resource alert created for Kalamassery Community Hall", time: "18 min ago" },
  { icon: "♡", description: "Family reconnection request verified", time: "24 min ago" },
];
