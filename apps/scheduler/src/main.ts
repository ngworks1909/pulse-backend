import { Expo } from "expo-server-sdk";
import { fetchBuses, fetchTrips } from "./action";
import { prisma } from "./lib/client";
import { sendNotificationsToUsers } from "./notifer/notifer";


function formatDate(date: Date){
    const travelDate = new Date(date);
    const formatted = travelDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).replace(/ /g, "-");
    return formatted
}




export async function main(){
    const trips = await fetchTrips();
    for (const trip of trips){
        const source = trip.source.code;
        const destination = trip.destination.code;
        const travelDate = formatDate(trip.travelDate);
        const buses = await fetchBuses(source, destination, travelDate);
        const allFares = buses.flatMap(bus => bus.fareList);
        const minFare = Math.min(...allFares);

        await prisma.fareSnapshot.create({
            data: {
                tripId: trip.tripId,
                fare: minFare
            }
        })

        const users = new Set<string>();
        const alertIds: string[] = [];

        for (const alert of trip.alerts) {
          if(!alert.user.token) continue;
          let token = alert.user.token.trim();
          if (!token.startsWith("ExponentPushToken[")) {
            // Format the token correctly
            token = `ExponentPushToken[${token}]`;
          }
          if (Expo.isExpoPushToken(token) && minFare <= alert.targetPrice) {
            users.add(token);
            alertIds.push(alert.alertId);
          }
        }

        if(users.size > 0){
            sendNotificationsToUsers(Array.from(users), minFare, trip.source.name, trip.destination.name, trip.travelDate)
        }

        if(alertIds.length > 0){
            await prisma.alert.updateMany({
                where: {
                    alertId: {
                        in: alertIds
                    }
                },
                data: {
                    notified: true
                }
            })
        }
    } 
}