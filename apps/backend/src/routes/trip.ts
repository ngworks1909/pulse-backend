import { Router } from "express";
import { UserRequest, verifyAuth } from "../middleware/auth";
import { createTripSchema } from "../zod/tripValidator";
import { prisma } from "../lib/client";
import z from "zod";

const router = Router();


const isSameDate = (date1: Date, date2: Date) => {
    return date1.getUTCFullYear() === date2.getUTCFullYear() &&
           date1.getUTCMonth() === date2.getUTCMonth() &&
           date1.getUTCDate() === date2.getUTCDate();
}

router.post("/create", verifyAuth("USER"), async(req: UserRequest, res) => {
    try {
        const userId = req.user?.userId;
        if(!userId){
            return res.status(400).json({message: "Invalid user"})
        }
        const createTripValidationResponse = createTripSchema.safeParse(req.body);
        if(!createTripValidationResponse.success){
            console.log(createTripValidationResponse.error.issues[0].message)
            return res.status(400).json({message: createTripValidationResponse.error.issues[0].message});
        }


        const {sourceId, destinationId, travelDate, targetPrice} = createTripValidationResponse.data;

        const normalizedTravelDate = new Date(travelDate);
        const today = new Date();
        today.setUTCHours(12, 0, 0, 0);
        normalizedTravelDate.setUTCHours(12, 0, 0, 0)
        if(normalizedTravelDate < today){
            return res.status(400).json({message: "Travel date should be in the future"});
        }
        const existingTrip = await prisma.trip.findUnique({
            where: {
                sourceId_destinationId_travelDate: {
                  sourceId,
                  destinationId,
                  travelDate: normalizedTravelDate
                }
            },
            select: {
                tripId: true,
                travelDate: true
            }
        });

        if(existingTrip && isSameDate(new Date(existingTrip.travelDate), normalizedTravelDate)){

            const existingAlert = await prisma.alert.findUnique({
                where: {
                    userId_tripId: {
                        userId,
                        tripId: existingTrip.tripId
                    }
                },select: {
                    alertId: true
                }
            });

            if(existingAlert){
                return res.status(400).json({message: "Alert already exists for this trip"});
            }

            await prisma.alert.create({
                data: {
                    userId,
                    tripId: existingTrip.tripId,
                    targetPrice: targetPrice
                }
            });

            return res.status(200).json({message: "Alert created successfully"});
        }


        await prisma.$transaction(async (tx: any) => {
            const newTrip = await tx.trip.create({
                data: {
                    sourceId, destinationId, travelDate: normalizedTravelDate
                },
                select: {
                    tripId: true
                }
            });

            await tx.alert.create({
                data: {
                    userId,
                    tripId: newTrip.tripId,
                    targetPrice
                }
            });
        })
        return res.status(200).json({message: "Trip and alert created successfully"});
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal server error"});
    }
});

router.delete("/delete/:alertId", verifyAuth("USER"), async(req: UserRequest, res) => {
    try {
        const userId = req.user?.userId;
        if(!userId){
            return res.status(400).json({ success: false, message: "Invalid user"})
        }
        const deleteTripValidationResponse = z.string({message: "Invalid alert"}).safeParse(req.params.alertId);
        if(!deleteTripValidationResponse.success){
            return res.status(400).json({success: false, message: deleteTripValidationResponse.error.issues[0].message});
        }
        const alertId = deleteTripValidationResponse.data;
        const alert = await prisma.alert.findUnique({
            where: {
                alertId
            },
            select: {
                userId: true
            }
        });
        if(!alert){
            return res.status(400).json({success: false, message: "Alert not found"});
        }
        if(alert.userId !== userId){
            return res.status(403).json({success: false, message: "Forbidden"});
        }
        await prisma.alert.delete({
            where: {
                alertId
            }
        });
        return res.status(200).json({success: true, message: "Alert deleted successfully"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({success: false, message: "Internal server error"});
    }
});


router.patch("/update/:alertId", verifyAuth("USER"), async(req: UserRequest, res) => {
    try {
        const userId = req.user!.userId;
        if(!userId){
            return res.status(400).json({message: "Invalid user"})
        }
        const deleteTripValidationResponse = z.string({message: "Invalid alert"}).safeParse(req.params.alertId);
        if(!deleteTripValidationResponse.success){
            return res.status(400).json({message: deleteTripValidationResponse.error.issues[0].message});
        }
        const alertId = deleteTripValidationResponse.data;
        const updateTripValidationResponse = createTripSchema.pick({targetPrice: true}).safeParse(req.body);
        if(!updateTripValidationResponse.success){
            return res.status(400).json({message: updateTripValidationResponse.error.issues[0].message});
        }
        const {targetPrice} = updateTripValidationResponse.data;
        const alert = await prisma.alert.findUnique({
            where: {
                alertId
            },
            select: {
                userId: true
            }
        });
        if(!alert){
            return res.status(400).json({message: "Alert not found"});
        }
        if(alert.userId !== userId){
            return res.status(403).json({message: "Forbidden"});
        }
        await prisma.alert.update({
            where: {
                alertId
            },
            data: {
                targetPrice
            }
        });
        return res.status(200).json({message: "Alert updated successfully"});
    } catch (error) {
        return res.status(500).json({message: "Internal server error"});
    }
});


router.get("/fetchalerts", verifyAuth("USER"), async (req: UserRequest, res) => {
  try {
    const userId = req.user!.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: "Invalid user" });
    }

    // Pagination inputs
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (page < 1 || limit < 1)
      return res.status(400).json({ success: false, message: "Invalid pagination values" });

    const skip = (page - 1) * limit;

    // Fetch alerts with pagination
    const alerts = await prisma.alert.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" }, // optional
      select: {
        alertId: true,
        targetPrice: true,
        trip: {
          select: {
            tripId: true,
            source: {
              select: {
                name: true,
                code: true,
              },
            },
            destination: {
              select: {
                name: true,
                code: true,
              },
            },
            travelDate: true,
            fareSnapshots: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                fare: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    // Total count for frontend
    const totalAlerts = await prisma.alert.count({
      where: { userId }
    });

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalAlerts,
      totalPages: Math.ceil(totalAlerts / limit),
      alerts
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});



export default router;