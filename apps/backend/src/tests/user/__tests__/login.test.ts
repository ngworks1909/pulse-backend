import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { DeepMockProxy, mockReset } from "jest-mock-extended";
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


describe("POST /api/user/signin", () => {

    //1.successful signin
    it("should signin an existing user", async() => {
        prismaMock.user.findUnique.mockResolvedValue({
            userId: "123",
            username: "nithin",
            mobile: "9999999999",
            token: null,
            role: "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const res = await request(app)
              .post("/api/user/signin")
              .send({ mobile: "9999999999" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Login successful.");
        expect(prismaMock.user.findUnique).toHaveBeenCalled();
    }) 

    // 2. fail if mobile not sent
    it('should fail if mobile number is not sent', async() => {
        const res = await request(app)
              .post("/api/user/signin")
        
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
    })

    //3. fail if user not found
    it('should fail if user is not found', async() => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        const res = await request(app)
              .post("/api/user/signin")
              .send({ mobile: "8888888888" });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("User not registered.");
        expect(prismaMock.user.findUnique).toHaveBeenCalled();
    })

    // 4. invalid mobile formats
    it("should fail if mobile number is invalid", async() => {
        const res = await request(app).post("/api/user/signin").send({ mobile: "12345" });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    })

    // 5. invalid mobile type
    it("should fail if mobile number format is invalid", async() => {
        const res = await request(app).post("/api/user/signin").send({ mobile: "abcd" });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    })

        // 6. prisma read error
    it("should fail if prisma.user.findUnique throws DB read error", async () => {
        prismaMock.user.findUnique.mockRejectedValue(new Error("DB read failure"));
    
        const res = await request(app)
          .post("/api/user/signin")
          .send({ mobile: "9999999999" });
    
        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
    });

    //  7. Unexpected runtime error in handler
      it("should handle unexpected runtime errors gracefully", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});
        prismaMock.user.findUnique.mockImplementation(() => {
          throw new Error("Unexpected runtime issue");
        });
    
        const res = await request(app)
          .post("/api/user/signin")
          .send({ mobile: "9999999999" });
    
        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
      });

      //  8. Invalid JSON body
        it("should fail when request body is not valid JSON", async () => {
          const res = await request(app)
            .post("/api/user/signin")
            .set("Content-Type", "text/plain")
            .send("invalid-body");
      
          expect(res.status).toBeGreaterThanOrEqual(400);
        });
      
        // 9.slow DB simulation
        it(
          "should simulate as low Prisma DB call and take >5s",
          async () => {
      
            (prismaMock.user.findUnique as jest.Mock).mockImplementation(() => {
              return new Promise((resolve) =>
               setTimeout(
                  () =>
                    resolve({
                      userId: "slow-123",
                      username: "nithin",
                      mobile: "9999999999",
                      token: null,
                      role: "USER",
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    }),
                  5000
                )
              );
            });
      
            const start = Date.now();
            const res = await request(app)
              .post("/api/user/signin")
              .send({ mobile: "9999999999" });
      
            const duration = Date.now() - start;
            expect(duration).toBeGreaterThanOrEqual(5000);
            expect([200, 408, 500]).toContain(res.status);
          },
          10000
        );

        // 10. prisma connection failure
        it("should fail when prisma connection fails", async () => {
            (prismaMock.user.findUnique as jest.Mock).mockImplementation(() => {
              throw new Error("Prisma connection lost");
            });
        
            const res = await request(app)
              .post("/api/user/signin")
              .send({  mobile: "9999999999" });
        
            expect(res.status).toBe(500);
        });

        it("should handle when Prisma throws a non-Error type (likestring or object)", async () => {
          prismaMock.user.findUnique.mockImplementation(() => {
            // @ts-ignoresimulate Prisma throwingsomething invalid
            throw "database is corrupted"; // not an Error instance
          });
        
          const res = await request(app)
            .post("/api/user/signin")
            .send({ mobile: "9999999999" });
        
          expect(res.status).toBe(500);
          expect(res.body.success).toBe(false);
        });

        
})
