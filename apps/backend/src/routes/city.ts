import { Router } from "express";
import { createCitySchema } from "../zod/cityValidator";
import { prisma } from "../lib/client";
import { verifyAuth } from "../middleware/auth";

const router = Router();

//city 124 Hyderabad

router.post("/create", verifyAuth("ADMIN"), async (req, res) => {
    const creatCityValidationResponse = createCitySchema.safeParse(req.body);
    if(!creatCityValidationResponse.success){
        return res.status(400).json({message: creatCityValidationResponse.error.issues[0].message});
    }

    const {name, code} = creatCityValidationResponse.data;
    try {
        const existsingCity = await prisma.city.findUnique({
            where: {
                name_code: {
                    name,
                    code
                }
            }
        });
        if(existsingCity){
            return  res.status(400).json({message: "City with same name and code already exists"});
        }
        await prisma.city.create({
            data: {
                name, code
            }
        })
        return res.status(200).json({message: "City created successfully"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
});


router.get("/searchcities", async (req, res) => {
    try {
        const name = req.query.name as string
        if(!name){
            const cities = await prisma.city.findMany({
                select: {
                    cityId: true,
                    name: true,
                },
                take: 4
            })
            return res.status(200).json({cities});
        }
        const cities = await prisma.city.findMany({
            where: {
                name: {
                    contains: name,
                    mode: "insensitive"
                },
            },
            select: {
                cityId: true,
                name: true,
            },
            take: 10
        });
        return res.status(200).json({cities});
    } catch (error) {
        return res.status(500).json({message: "Internal server error"});
    }
});

export default router;