export function getDifferenceInMinutes(time1: string, time2: string): number {
    // Convert the string times into Date objects
    const date1 = new Date(time1);
    const date2 = new Date(time2);

    // Calculate the difference in milliseconds
    const diffInMs = (date2.getTime() - date1.getTime());

    // Convert milliseconds to hours
    const diffInMinutes = diffInMs / (1000 * 60);

    return diffInMinutes;
}