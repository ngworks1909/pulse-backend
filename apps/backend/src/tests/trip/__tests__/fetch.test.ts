import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { DeepMockProxy, mockReset } from "jest-mock-extended";
import jwt from "jsonwebtoken";
import request from "supertest";
import { app } from "../../..";
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

const token = jwt.sign({user: {userId: "123", role: "USER"}}, secret, {expiresIn: '1h'});

describe("GET /api/trip/fetchalerts", () => {
    //1. successful fetch of alerts
    it("should fetch all alerts for the user", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "user1",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        prismaMock.alert.findMany.mockResolvedValue([
            {
                alertId: "alert123",
                userId: "123",
                tripId: "trip123",
                targetPrice: 100,
                createdAt: new Date(),
                updatedAt: new Date(),
                notified: false
            },
            {
                alertId: "alert124",
                userId: "123",
                tripId: "trip124",
                targetPrice: 150,
                createdAt: new Date(),
                updatedAt: new Date(),
                notified: true
            }
        ]);

        const res = await request(app)
              .get("/api/trip/fetchalerts")
              .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.alerts).toHaveLength(2);
        expect(prismaMock.user.findUnique).toHaveBeenCalled();
        expect(prismaMock.alert.findMany).toHaveBeenCalled();
    });

    it("should fail for missing token", async() => {
        const res = await request(app)
              .get("/api/trip/fetchalerts");

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized");
    });
    
    it("should fail for invalid token", async() => {
        const res = await request(app)
              .get("/api/trip/fetchalerts")
              .set("Authorization", `Bearer invalidtoken`); 
        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Invalid or expired token");
    });
})