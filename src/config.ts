import dotenv from 'dotenv'
dotenv.config()
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
export const PORT: number = Number(process.env.PORT)