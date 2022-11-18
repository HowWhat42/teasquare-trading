import dotenv from 'dotenv'
dotenv.config()
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
export const PORT: number = Number(process.env.PORT)
export const BOT_TOKEN = process.env.BOT_TOKEN
export const CHAT_ID = process.env.CHAT_ID
export const DEBUG_CHAT_ID = process.env.DEBUG_CHAT_ID