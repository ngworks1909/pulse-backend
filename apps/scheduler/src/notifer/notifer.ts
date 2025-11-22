import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

// Create a new Expo SDK client
const expo = new Expo();

export const sendNotificationsToUsers = async (
  tokens: string[],
  fare: number,
  source: string,
  destination: string,
  date: Date
): Promise<void> => {
  if (tokens.length === 0) {
    console.log("No tokens provided");
    return;
  }



  if (tokens.length === 0) {
    console.log("❌ No valid Expo push tokens found");
    return;
  }

  // Build the message payloads
  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    sound: "default",
    title: "🚌 New Bus Available",
    body: `${source} ➝ ${destination} | ₹${fare} | ${date.toDateString()}`,
    data: {
      type: "bus_alert",
      source,
      destination,
      fare: fare.toString(),
      date: date.toISOString(),
    },
    channelId: "bus_alerts",
    priority: "high",
  }));

  try {
    // Send notifications in chunks (Expo recommends batching)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error("🔥 Error sending chunk:", error);
      }
    }

    // Log results
    let successCount = tickets.filter((t) => t.status === "ok").length;
    let failCount = tickets.length - successCount;

    console.log(`✅ Successfully sent: ${successCount}, ❌ Failed: ${failCount}`);

    // Handle errors like invalid tokens
    tickets.forEach((ticket, idx) => {
      if (ticket.status !== "ok") {
        console.error(`❌ Token ${tokens[idx]} failed:`, ticket.message);
        if (
          ticket.details?.error === "DeviceNotRegistered" ||
          ticket.details?.error === "InvalidCredentials"
        ) {
          // ⚠️ Remove invalid tokens from your database here
        }
      }
    });
  } catch (err) {
    console.error("🔥 Error sending notifications:", err);
  }
};
