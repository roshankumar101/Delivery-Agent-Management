import type { ServiceAreaFilterOption } from '../types/serviceArea';

export const serviceAreaOptions = [
  'All areas',
  'Bangalore',
  'Delhi',
  'Gurgaon',
  'Pune',
  'Noida',
  'Mumbai',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
] as const satisfies readonly ServiceAreaFilterOption[];
