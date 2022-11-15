import ccxt, { BadRequest } from 'ccxt'
import { prisma } from '../config'

export let accounts: ccxt.bybit[] = []

export const createAccount = (api: string, secret: string) => {
    const account = new ccxt.bybit({ apiKey: api, secret })
    accounts.push(account)
}

export const loadAccounts = async () => {
    const credentials = await prisma.credentials.findMany({ where: { active: true } })
    credentials.map(credential => createAccount(credential.api, credential.secret))
}

export const removeAccount = (api: string) => {
    accounts = accounts.filter(account => account.apiKey !== api)
}

export const checkBalance = async (account: ccxt.bybit, symbol: string) => {
    try {
        const balances = await account.fetchBalance()
        return balances[symbol]
    } catch (error) {
        throw error
    }
}

export const setLeverage = async (account: ccxt.bybit, symbol: string, value: number) => {
    try {
        await account.privatePostPrivateLinearPositionSetLeverage({ symbol, buy_leverage: value, sell_leverage: value })
    } catch (error: any) {
        if (error.message.includes('leverage not modified')) {
            console.log('Not modified')
        } else {
            throw new BadRequest(error.message)
        }
    }
}