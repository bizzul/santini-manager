export const euStringToDateTimeString = (s: string) => {
    const splitted = s.split('.')
    return `${splitted[2]}-${splitted[1]}-${splitted[0]} 00:00:00`
}