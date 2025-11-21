import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { DeepMockProxy, mockReset } from "jest-mock-extended";
import jwt from "jsonwebtoken";
import request from "supertest";
import { app } from "../../../index";
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

describe("GET /api/user/refresh", () => {

    //1. Successful token refresh
    it("should fetch a new token", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username : "nithin",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        
        const res = await request(app)
              .get("/api/user/refresh")
              .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
    })

    it("should fail for invalid token", async() => {
        const res = await request(app)
              .get("/api/user/refresh")
              .set("Authorization", `Bearer invalidtoken`);
        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Invalid or expired token");
    })

    it("should fail for missing token", async() => {
        const res = await request(app)
              .get("/api/user/refresh");
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized");
    })
})