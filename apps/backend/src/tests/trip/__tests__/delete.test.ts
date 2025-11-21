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

const token = jwt.sign({user: {userId: "123", role: "USER"}}, secret, {expiresIn: '1h'});

describe("DELETE /api/trip/delete/:tripId", () => {
    //1. successful trip deletion
    it("should delete a trip", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "user1",
            mobile: "9999999999",
            token: null,
            role: "USER",
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

        prismaMock.alert.delete.mockResolvedValue({
            alertId: "alert123",
            userId: "123",
            tripId: "trip123",
            targetPrice: 100,
            createdAt: new Date(),
            updatedAt: new Date(),
            notified: false
        })

        const res = await request(app)
              .delete("/api/trip/delete/alert123")
              .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Alert deleted successfully");
        expect(prismaMock.alert.delete).toHaveBeenCalled();
    });

    it("should fail for invalid tripId", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "user1",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        prismaMock.alert.findUnique.mockResolvedValue(null);

        const res = await request(app)
              .delete("/api/trip/delete/''")
              .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Alert not found");
    });
    
    it("should fail for missing token", async() => {
        const res = await request(app)
              .delete("/api/trip/delete/alert123");
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized");
    });

    it("should fail to delete alert if it does not belong to user", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "user1",
            mobile: "9999999999",
            token: null,
            role: "ADMIN",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        prismaMock.alert.findUnique.mockResolvedValue({
            alertId: "alert123",
            userId: "differentUserId",
            tripId: "trip123",
            targetPrice: 100,
            createdAt: new Date(),
            updatedAt: new Date(),
            notified: false
        });

        const res = await request(app)
              .delete("/api/trip/delete/alert123")
              .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Forbidden");

    })
});