import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { DeepMockProxy, mockReset } from "jest-mock-extended";
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

describe("POST /api/user/signup", () => {
  // 1.successful signup
  it("should create a new user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      userId: "123",
      username: "nithin",
      mobile: "9999999999",
      token: null,
      role: "USER",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post("/api/user/signup")
      .send({ username: "nithin", mobile: "9999999999" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Signup successful.");
    expect(prismaMock.user.create).toHaveBeenCalled();
  });

  //  2. Missing username
  it("should fail when username is missing", async () => {
    const res = await request(app)
      .post("/api/user/signup")
      .send({ mobile: "9999999999" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  //  3. Missing mobile
  it("should fail when mobile number is missing", async () => {
    const res = await request(app)
      .post("/api/user/signup")
      .send({ username: "nithin" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  //  4. Invalid mobile format
  it("should fail when mobile number format is invalid", async () => {
    const res = await request(app)
      .post("/api/user/signup")
      .send({ username: "nithin", mobile: "abcd" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  //  5. Empty username and mobile
  it("should fail when username and mobile are empty", async () => {
    const res = await request(app)
      .post("/api/user/signup")
      .send({ username: "", mobile: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  //  6. Invalid mobile length
  it("should fail when mobile number length is not 10 digits", async () => {
    const res = await request(app)
      .post("/api/user/signup")
      .send({ username: "nithin", mobile: "70141156" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  //  7. Username too short
  it("should fail when username is tooshort", async () => {
    const res = await request(app)
      .post("/api/user/signup")
      .send({ username: "a", mobile: "9999999999" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  //  9. User already exists
  it("should fail when user already exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      userId: "existing",
      username: "nithin",
      mobile: "9999999999",
      token: null,
      role: "USER",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post("/api/user/signup")
      .send({ username: "nithin", mobile: "9999999999" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("User already exists.");
  });

  //  10. Database error during findUnique
  it("should fail if prisma.user.findUnique throws DB read error", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("DB read failure"));

    const res = await request(app)
      .post("/api/user/signup")
      .send({ username: "nithin", mobile: "9999999999" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  //  11. Database error during create
  it("should fail if prisma.user.create throws DB insert error", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockRejectedValue(new Error("DB insert failure"));

    const res = await request(app)
      .post("/api/user/signup")
      .send({ username: "nithin", mobile: "9999999999" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  //  12. Unique constraint violation during create (Prisma P2002)
  it("should fail if Prisma unique constraint (P2002) is triggered", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const prismaError = new PrismaClientKnownRequestError(
      "Unique constraint failed on the field: `mobile`",
      { code: "P2002", clientVersion: "5.13.0" }
    );

    prismaMock.user.create.mockRejectedValue(prismaError);

    const res = await request(app)
      .post("/api/user/signup")
      .send({ username: "nithin", mobile: "9999999999" });

    expect(res.status).toBe(400);
  });

  //  13. Unexpected runtime error in handler
  it("should handle unexpected runtime errors gracefully", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.user.findUnique.mockImplementation(() => {
      throw new Error("Unexpected runtime issue");
    });

    const res = await request(app)
      .post("/api/user/signup")
      .send({ username: "nithin", mobile: "9999999999" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  //  14. Invalid JSON body
  it("should fail when request body is not valid JSON", async () => {
    const res = await request(app)
      .post("/api/user/signup")
      .set("Content-Type", "text/plain")
      .send("invalid-body");

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // 15.slow DB simulation
  it(
    "should simulate as low Prisma DB call and take >5s",
    async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      (prismaMock.user.create as jest.Mock).mockImplementation(() => {
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
        .post("/api/user/signup")
        .send({ username: "nithin", mobile: "9999999999" });

      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(5000);
      expect([200, 408, 500]).toContain(res.status);
    },
    10000
  );

  //  16. Prisma connection failure
  it("should fail when prisma connection fails", async () => {
    (prismaMock.user.findUnique as jest.Mock).mockImplementation(() => {
      throw new Error("Prisma connection lost");
    });

    const res = await request(app)
      .post("/api/user/signup")
      .send({ username: "nithin", mobile: "9999999999" });

    expect(res.status).toBe(500);
  });

  //  17. Null body
  it("should fail if body is completely missing", async () => {
    const res = await request(app).post("/api/user/signup").send();
    expect(res.status).toBe(400);
  });

  //  18. Non-string username type
  it("should fail if username is not a string", async () => {
    const res = await request(app)
      .post("/api/user/signup")
      .send({ username: 12345, mobile: "9999999999" });

    expect(res.status).toBe(400);
  });

  //  19. Non-string mobile type
  it("should fail if mobile is not a string", async () => {
    const res = await request(app)
      .post("/api/user/signup")
      .send({ username: "nithin", mobile: 9999999999 });

    expect(res.status).toBe(400);
  });

  //  17. Prisma method throws non-Error type
it("should handle when Prisma throws a non-Error type (likestring or object)", async () => {
  prismaMock.user.findUnique.mockImplementation(() => {
    // @ts-ignoresimulate Prisma throwingsomething invalid
    throw "database is corrupted"; // not an Error instance
  });

  const res = await request(app)
    .post("/api/user/signup")
    .send({ username: "nithin", mobile: "9999999999" });

  expect(res.status).toBe(500);
  expect(res.body.success).toBe(false);
});

});
