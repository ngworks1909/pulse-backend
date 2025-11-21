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

describe("PUT /api/user/update", () => {
    
    //1. should pass for valid token
    it("should pass with a valid token", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "nithin",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        prismaMock.user.update.mockResolvedValue({
            userId: "123",
            username: "arjun",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const res = await request(app).put("/api/user/update")
                            .set("Authorization", `Bearer ${token}`)
                            .send({username: "arjun"});
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(prismaMock.user.findUnique).toHaveBeenCalled();
        expect(prismaMock.user.update).toHaveBeenCalled();
    })

    it("should fail for missing token", async() => {
        const res = await request(app).put("/api/user/update")
                            .send({username: "arjun"});
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized");
    })

    it("should fail for invalid token", async() => {
        const res = await request(app).put("/api/user/update")
                            .set("Authorization", `Bearer invalidtoken`)
                            .send({username: "arjun"});
        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Invalid or expired token");
    })

    it("should fail for non existing user", async() => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        const res = await request(app).put("/api/user/update")
                            .set("Authorization", `Bearer ${token}`)
                            .send({username: "arjun"});
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized");
        expect(prismaMock.user.findUnique).toHaveBeenCalled();
    })

    it("should fail for role mismatch", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "nithin",
            mobile: "9999999999",
            token: null,
            role: "ADMIN",
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const res = await request(app).put("/api/user/update")
                            .set("Authorization", `Bearer ${token}`)
                            .send({username: "arjun"});
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Forbidden");
        expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
            where: {
                userId: "123",
            },
            select: {
                userId: true,
                role: true,
            }
        });
    })

    it("should fail for empty username", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "nithin",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        const res = await request(app).put("/api/user/update")
                            .set("Authorization", `Bearer ${token}`)
                            .send({username: ""});
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    })

    it("should fail for invalid username", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "nithin",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        const res = await request(app).put("/api/user/update")
                            .set("Authorization", `Bearer ${token}`)
                            .send({username: 12345});
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    })

    it("should fail for no username", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "nithin",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        const res = await request(app).put("/api/user/update")
                            .set("Authorization", `Bearer ${token}`)
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    })
})