import { teardownZztestHours } from "./zztest-hours-seed";

export default async function globalTeardown(): Promise<void> {
  await teardownZztestHours();
}
