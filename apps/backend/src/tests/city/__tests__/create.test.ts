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

const token = jwt.sign({user: {userId: "123"}}, secret, {expiresIn: '1h'});


describe("POST /api/city/create", () => {

    //1. successful city creation
    it("should create a new city", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "admin",
            mobile: "9999999999",
            token: null,
            role: "ADMIN",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        prismaMock.city.findUnique.mockResolvedValue(null);
        prismaMock.city.create.mockResolvedValue({
            cityId: "city123",
            name: "Metropolis",
            code: "134",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const res = await request(app)
              .post("/api/city/create")
              .set("Authorization", `Bearer ${token}`)
              .send({ name: "Metropolis", code: "134" });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("City created successfully");
        expect(prismaMock.city.create).toHaveBeenCalled();

    });

    it("should faile if city already exists", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "admin",
            mobile: "9999999999",
            token: null,
            role: "ADMIN",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        prismaMock.city.findUnique.mockResolvedValue({
            cityId: "city123",
            name: "Metropolis",
            code: "134",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const res = await request(app)
              .post("/api/city/create")
              .set("Authorization", `Bearer ${token}`)
              .send({ name: "Metropolis", code: "134" });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("City with same name and code already exists");
    })

    it("should fail for non-admin user", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "user",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const res = await request(app)
              .post("/api/city/create")
              .set("Authorization", `Bearer ${token}`)
              .send({ name: "Metropolis", code: "134" });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Forbidden");
    })

})