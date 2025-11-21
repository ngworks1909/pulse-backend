import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { DeepMockProxy, mockReset } from "jest-mock-extended";
import jwt from "jsonwebtoken";
import request from "supertest";
import { app } from "../../../bin";
import { prisma } from "../../../lib/client";

jest.mock("../../../lib/client");

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
  jest.clearAllMocks();
});

afterAll(async () => {
  if (typeof prisma.$disconnect === "function") {
    await prisma.$disconnect();
  }
});

const secret = process.env.JWT_SECRET!;

const token = jwt.sign({user: {userId: "123"}}, secret, {expiresIn: '1h'});


describe("POST /api/trip/create", () => {
    //1. successful trip creation
    it("should create a new trip and alert", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "user1",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        prismaMock.trip.findUnique.mockResolvedValue(null);
        (prismaMock.$transaction as jest.Mock).mockImplementation(() => {
            prismaMock.trip.create.mockResolvedValue({
                tripId: "trip123",
                sourceId: "city123",
                destinationId: "city124",
                travelDate: new Date("2025-12-25"),
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            prismaMock.alert.create.mockResolvedValue({
                alertId: "alert123",
                userId: "123",
                tripId: "trip123",
                targetPrice: 100,
                createdAt: new Date(),
                updatedAt: new Date(),
                notified: false
            });
        })
    

        const res = await request(app)
              .post("/api/trip/create")
              .set("Authorization", `Bearer ${token}`)
              .send({ sourceId: "city123", destinationId: "city124", travelDate: "2025-12-25", targetPrice: 100 });

        expect(res.status).toBe(200);
        expect(prismaMock.$transaction).toHaveBeenCalled();
        expect(res.body.message).toBe("Trip and alert created successfully");
    })

    //2. should create alert for existing trip
    it("should create alert for existing trip", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "user1",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        prismaMock.trip.findUnique.mockResolvedValue({
            tripId: "trip123",
            sourceId: "city123",
            destinationId: "city124",
            travelDate: new Date("2025-12-25"),
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        prismaMock.alert.findUnique.mockResolvedValue(null);
        prismaMock.alert.create.mockResolvedValue({
            alertId: "alert123",
            userId: "123",
            tripId: "trip123",
            targetPrice: 100,
            createdAt: new Date(),
            updatedAt: new Date(),
            notified: false
        });

        const res = await request(app)
              .post("/api/trip/create")
              .set("Authorization", `Bearer ${token}`)
              .send({ sourceId: "city123", destinationId: "city124", travelDate: "2025-12-25", targetPrice: 100 });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Alert created successfully");
        expect(prismaMock.alert.create).toHaveBeenCalled();
    })

    it("should fail if alert already exists for the trip", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "user1",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        prismaMock.trip.findUnique.mockResolvedValue({
            tripId: "trip123",
            sourceId: "city123",
            destinationId: "city124",
            travelDate: new Date("2025-12-25"),
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        prismaMock.alert.findUnique.mockResolvedValue({
            alertId: "alert123",
            userId: "123",
            tripId: "trip123",
            targetPrice: 100,
            createdAt: new Date(),
            updatedAt: new Date(),
            notified: false
        });

        const res = await request(app)
              .post("/api/trip/create")
              .set("Authorization", `Bearer ${token}`)
              .send({ sourceId: "city123", destinationId: "city124", travelDate: "2025-12-25", targetPrice: 100 });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Alert already exists for this trip");
    })

    it("should fail for missing fields", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "user1",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const res = await request(app)
              .post("/api/trip/create")
              .set("Authorization", `Bearer ${token}`)
              .send({ sourceId: "city123", travelDate: "2025-12-25", targetPrice: 100 });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("destination city id is required");
        
    })

    it("should fail for past travel date", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "user1",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const res = await request(app)
              .post("/api/trip/create")
              .set("Authorization", `Bearer ${token}`)
              .send({ sourceId: "city123", destinationId: "city124", travelDate: "2020-12-25", targetPrice: 100 });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Travel date should be in the future");
        
    });

    it("should fail for invalid user", async() => {
        prismaMock.user.findUnique.mockResolvedValue(null);
        const res = await request(app)
              .post("/api/trip/create")
              .set("Authorization", `Bearer ${token}`)
              .send({ sourceId: "city123", destinationId: "city124", travelDate: "2025-12-25", targetPrice: 100 });
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized");
        
    });

    it("should fail for non-user role", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "admin123",
            username: "admin",
            mobile: "9999999999",
            token: null,
            role: "ADMIN",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        const res = await request(app)
              .post("/api/trip/create")
              .set("Authorization", `Bearer ${token}`)
              .send({ sourceId: "city123", destinationId: "city124", travelDate: "2025-12-25", targetPrice: 100 });
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Forbidden");
        
    });
})