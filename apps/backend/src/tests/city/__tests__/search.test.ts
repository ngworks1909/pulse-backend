import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { DeepMockProxy, mockReset } from "jest-mock-extended";
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


describe("GET /api/city/searchcities", () => {
    //1. Successful city search
    it("should fetch city successfully", async() => {
        prismaMock.city.findMany.mockResolvedValue([{
            cityId: "city123",
            name: "Metropolis",
            code: "134",
            createdAt: new Date(),
            updatedAt: new Date(),
        }]);
        
        const res = await request(app)
              .get("/api/city/searchcities")
              .query({ name: "Metro" });
        expect(res.status).toBe(200);
        expect(res.body.cities.length).toBe(1);
        expect(prismaMock.city.findMany).toHaveBeenCalled();
    })

    //2. should fetch all cities if name is empty
    it("should fetch all cities if name is empty", async() => {
        prismaMock.city.findMany.mockResolvedValue([{
            cityId: "city123",
            name: "Metropolis",
            code: "134",
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            cityId: "city124",
            name: "Gotham",
            code: "135",
            createdAt: new Date(),
            updatedAt: new Date(),
        }]);
        
        const res = await request(app)
              .get("/api/city/searchcities").query({name: ""});
        expect(res.status).toBe(200);
        expect(res.body.cities.length).toBe(2);
        expect(prismaMock.city.findMany).toHaveBeenCalled();
    })

    it("should handle server errors", async() => {
        prismaMock.city.findMany.mockRejectedValue(new Error("DB error"));
        
        const res = await request(app)
              .get("/api/city/searchcities")
              .query({ name: "Metro" });
        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Internal server error");
    })
})