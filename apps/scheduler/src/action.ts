import axios from "axios";
import { prisma } from "./lib/client";

interface Bus{
    operatorId: number;
    travelsName: string;
    busType: string;
    busTypeId: number;
    totalRatings: number;
    numberOfReviews: number;
    departureTime: string;
    arrivalTime: string;
    journeyDurationMin: number;
    standardBpName: string;
    standardpName: string;
    isAc: boolean;
    isSleeper: boolean;
    fareList: number[];
}

export async function fetchTrips(){
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const trips = await prisma.trip.findMany({
        where: {
            travelDate: {
                gte: today
            },
            alerts: {
                some: {
                    notified: false
                }
            }
        },
        select: {
            travelDate: true,
            tripId: true,
            source: {
                select: {
                    code: true,
                    name: true
                }
            },
            destination: {
                select: {
                    code: true,
                    name: true
                }
            },
            alerts: {
                select: {
                    userId: true,
                    alertId: true,
                    user: {
                        select: {
                            token: true
                        }
                    },
                    targetPrice: true
                }
            }
        }
    });
    return trips;
}


export async function fetchBuses(source: string, destination: string, date: string){
    console.log(`Fetching buses for ${source} to ${destination} on ${date}`)
    const url = `https://www.redbus.in/rpw/api/searchResults?fromCity=${source}&toCity=${destination}&DOJ=${date}&limit=25&offset=0&meta=true&groupId=0&sectionId=0&sort=0&sortOrder=0&from=initialLoad&getUuid=true&bT=1&clearLMBFilter=undefined`;
    const response = await axios.post(url);
    const buses = response.data.data.inventories as Bus[];
    return buses;
}



