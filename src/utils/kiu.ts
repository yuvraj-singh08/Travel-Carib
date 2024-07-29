export const getDateString = (date: string) => {
    const newDate = new Date(date);
    console.log(newDate);
    const dateString = newDate.toISOString().slice(0, 10);
    return dateString;
}