import axios from 'axios'
import { CHAT_ID, DEBUG_CHAT_ID, BOT_TOKEN } from "../config"

export const sendMessage = async (message: string) => {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${message}`)
}

export const sendDebugMessage = async (message: string) => {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${DEBUG_CHAT_ID}&text=${message}`)
}