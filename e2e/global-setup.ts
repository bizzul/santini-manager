import { seedZztestHours } from "./zztest-hours-seed";

export default async function globalSetup(): Promise<void> {
  await seedZztestHours();
}
