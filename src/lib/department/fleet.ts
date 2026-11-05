/** TPD | Vehicles tab (the Vehicle Database named in HB §11). See ./sources.ts. */

import { RANKS, type Rank } from "@/lib/authz";

export interface Vehicle {
  name: string;
  model: string;
  livery: string;
  /** "Authorized ranks" as written on the tab. */
  authorized: string;
  minRank: Rank;
  use: string;
  status: "Approved";
}

export const VEHICLES: Vehicle[] = [
  {
    name: "2015 Charger",
    model: "Bullhorn Prancer Pursuit 2015",
    livery: "TPD Standard Patrol",
    authorized: "Probationary Officer & above",
    minRank: "Probationary Officer",
    use: "General patrol",
    status: "Approved",
  },
  {
    name: "2019 FPIU",
    model: "Falcon Interceptor Utility 2019",
    livery: "TPD Standard Patrol",
    authorized: "Senior Officer & above",
    minRank: "Senior Officer",
    use: "General patrol",
    status: "Approved",
  },
  {
    name: "2024 FPIU",
    model: "Falcon Interceptor Utility 2024",
    livery: "TPD Standard Patrol",
    authorized: "Sergeant & above",
    minRank: "Sergeant",
    use: "Field supervision & command",
    status: "Approved",
  },
];

/**
 * The tab's "Vehicle Authorization by Rank" matrix, transcribed cell by cell.
 * Order: 2015 Charger, 2019 FPIU, 2024 FPIU. Note the matrix authorizes
 * Corporals for the 2019 FPIU although the fleet table says "Senior Officer & above".
 */
export const AUTHORIZATION: Record<Rank, [boolean, boolean, boolean]> = {
  "Chief of Police": [true, true, true],
  "Deputy Chief": [true, true, true],
  "Assistant Chief": [true, true, true],
  Major: [true, true, true],
  Captain: [true, true, true],
  Lieutenant: [true, true, true],
  Sergeant: [true, true, true],
  Corporal: [true, true, false],
  "Senior Officer": [true, true, false],
  Officer: [true, false, false],
  "Reserve Officer": [true, false, false],
  "Probationary Officer": [true, false, false],
};

/** Authorization comes from the matrix, which is the more specific of the two tables. */
export function vehicleAuthorized(rank: Rank, vehicle: Vehicle): boolean {
  const i = VEHICLES.findIndex((v) => v.name === vehicle.name);
  return i >= 0 ? AUTHORIZATION[rank][i] : false;
}

export { RANKS };
