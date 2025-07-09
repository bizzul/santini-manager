declare module "date-fns-tz" {
  export function formatInTimeZone(
    date: Date | string | number,
    timeZone: string,
    formatStr: string
  ): string;
}
