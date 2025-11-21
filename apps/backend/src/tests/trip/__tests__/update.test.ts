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

describe("PATCH /api/trip/update/:alertId", () => {
    //1. should pass for valid token and valid alertId
    it("should pass with a valid token and valid alertId", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "user1",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        prismaMock.alert.findUnique.mockResolvedValue({
            alertId: "alert123",
            userId: "123",
            tripId: "trip123",
            targetPrice: 100,
            createdAt: new Date(),
            updatedAt: new Date(),
            notified: false
        });

        prismaMock.alert.update.mockResolvedValue({
            alertId: "alert123",
            userId: "123",
            tripId: "trip123",
            targetPrice: 80,
            createdAt: new Date(),
            updatedAt: new Date(),
            notified: false
        });

        const res = await request(app).patch("/api/trip/update/alert123")
                            .set("Authorization", `Bearer ${token}`)
                            .send({targetPrice: 80});
        expect(res.status).toBe(200);
        expect(prismaMock.user.findUnique).toHaveBeenCalled();
        expect(prismaMock.alert.findUnique).toHaveBeenCalled();
        expect(prismaMock.alert.update).toHaveBeenCalled();
    })

    it("should fail for missing token", async() => {
        const res = await request(app).patch("/api/trip/update/alert123")
                            .send({targetPrice: 80});
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized");
    })

    it("should fail if alert id not passed", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "user1",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const res = await request(app).patch("/api/trip/update/''")
                            .set("Authorization", `Bearer ${token}`)
                            .send({targetPrice: 80});
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Alert not found");

    })

    it("should fail for non existing alert", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "user1",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        prismaMock.alert.findUnique.mockResolvedValue(null);

        const res = await request(app).patch("/api/trip/update/alert123")
                            .set("Authorization", `Bearer ${token}`)
                            .send({targetPrice: 80});
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Alert not found");
        expect(prismaMock.user.findUnique).toHaveBeenCalled();
        expect(prismaMock.alert.findUnique).toHaveBeenCalled();
    })
    
    it("should fail for alert not belonging to user", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "user1",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        })  
        prismaMock.alert.findUnique.mockResolvedValue({
            alertId: "alert123",
            userId: "456",
            tripId: "trip123",
            targetPrice: 100,
            createdAt: new Date(),
            updatedAt: new Date(),
            notified: false
        });

        const res = await request(app).patch("/api/trip/update/alert123")
                            .set("Authorization", `Bearer ${token}`)
                            .send({targetPrice: 80});
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Forbidden");
        expect(prismaMock.user.findUnique).toHaveBeenCalled();
        expect(prismaMock.alert.findUnique).toHaveBeenCalled();
    })
})