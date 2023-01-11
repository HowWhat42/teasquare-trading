import { credentials, trades } from '@prisma/client'
import ccxt, { BadRequest } from 'ccxt'
import { prisma } from '../config'
import { updateDailyCell } from '../utils/googleapi'
import { sendMessage } from '../utils/telegram'

export let accounts: ccxt.pro.bybit[] = []

export const createAccount = (api: string, secret: string) => {
    const account = new ccxt.pro.bybit({ apiKey: api, secret })
    accounts.push(account)
}

export const loadAccounts = async () => {
    const credentials = await prisma.credentials.findMany({ where: { active: true } })
    credentials.map(credential => createAccount(credential.api, credential.secret))
}

export const removeAccount = (api: string) => {
    accounts = accounts.filter(account => account.apiKey !== api)
}

export const checkBalance = async (account: ccxt.pro.bybit, symbol: string) => {
    try {
        const balances = await account.fetchBalance()
        return balances[symbol]
    } catch (error) {
        throw error
    }
}

export const setLeverage = async (account: ccxt.pro.bybit, symbol: string, value: number) => {
    try {
        await account.privatePostPrivateLinearPositionSwitchMode({ symbol, mode: 'BothSide' })
    } catch (error: any) {
        if (error.message.includes('position mode not modified')) {
            console.log('Position mode not modified')
        } else {
            throw new BadRequest(error.message)
        }
    }
    try {
        await account.privatePostPrivateLinearPositionSwitchIsolated({ symbol, is_isolated: true, buy_leverage: value, sell_leverage: value })
    } catch (error: any) {
        if (error.message.includes('Isolated not modified')) {
            console.log('Isolated not modified')
        } else {
            throw new BadRequest(error.message)
        }
    }
    try {
        await account.privatePostPrivateLinearPositionSetLeverage({ symbol, buy_leverage: value, sell_leverage: value })
    } catch (error: any) {
        if (error.message.includes('leverage not modified')) {
            console.log('Leverage not modified')
        } else {
            throw new BadRequest(error.message)
        }
    }
}

export const watchTrades = async (account: ccxt.pro.bybit) => {
    let isOn = false
    do {
        try {
            const accountIndex = accounts.indexOf(account)
            if (accountIndex !== -1) {
                isOn = true
            } else {
                break
            }
            const trades = await accounts[accountIndex].watchMyTrades()

            handleTrade(accounts[accountIndex].apiKey, trades[0])
        } catch (error) {
            console.log(error)
        }
    } while (isOn)
}

const handleTrade = async (api: string, trade: ccxt.Trade) => {
    const closeSide = trade.side === "buy" ? "sell" : "buy"
    const openTrade = await prisma.trades.findFirst({ where: { credentials: { api }, side: closeSide, pair: trade.info.symbol, open: true }, include: { credentials: true } })
    if (!openTrade) return
    closeTrade(api, trade, openTrade)
}

export const newTrade = async (account: ccxt.pro.bybit, baseOrder: ccxt.Order, openTrade: (trades & { credentials: credentials | null })) => {
    try {
        let order = baseOrder
        while (order.status === "open") {
            order = await account.fetchOrder(order.id, openTrade.pair);
        }
        await prisma.trades.updateMany({
            where: {
                pair: openTrade.pair,
                open: true,
                credentials: {
                    api: openTrade.credentials?.api
                }
            },
            data: {
                size: order.amount,
                entryPrice: order.average,
                status: "filled",
                updatedAt: new Date(Date.now())
            }
        })
        console.log('trade filled')
    } catch (error) {
        console.log(error)
    }
}

const closeTrade = async (api: string, trade: ccxt.Trade, openTrade: (trades & { credentials: credentials | null })) => {
    const price = trade.price
    let percent = (price - openTrade.entryPrice) / price * 100 * openTrade.leverage
    if (trade.side === 'buy') {
        percent = -percent
    }
    const pnl = trade.amount / openTrade.leverage * openTrade.entryPrice * percent / 100 - trade.fee.cost
    const win = percent > 0 ? true : false
    await prisma.trades.updateMany({
        where: {
            pair: trade.info.symbol,
            open: true,
            credentials: {
                api
            }
        },
        data: {
            open: false,
            closingPrice: price,
            percent,
            win,
            size: trade.amount,
            status: "closed",
            updatedAt: new Date(Date.now())
        }
    })
    const sideText = openTrade.side === 'buy' ? 'LONG 🟢' : 'SHORT 🔴'
    console.log('trade closed')
    if (!openTrade.credentials) return
    sendMessage(`Clotûre de trade ! ${win ? '✅' : '❌'}%0ACompte: ${openTrade.credentials.name}%0ACrypto: ${openTrade.pair}%0ATrade: ${sideText} x${openTrade.leverage}%0APrix d'entrée: ${openTrade.entryPrice}$%0APrix de clôture: ${price}$%0APNL: ${pnl.toFixed(2)}$%0A${win ? 'Gain' : 'Perte'}: ${percent.toFixed(2)}%`)

    if (openTrade.credentials.name === "TheBilster") {
        await updateDailyCell((percent / 100) * (openTrade.credentials.bankrollPercentage / 100))
    }
}