import { accounts } from "./account"
import { prisma } from '../config'
import ccxt from 'ccxt'

type side = "buy" | "sell"
const defaultAccount = new ccxt.bybit()

const marketParser = async (rawPair: string) => {
    const symbol = rawPair.split('USDT')[0].split('BUSD')[0]
    const marketIndex = `${symbol}/USDT:USDT`
    const markets = await defaultAccount.loadMarkets()
    const market = markets[marketIndex]
    if (market) {
        const limit = Number(market?.limits?.amount?.min)
        const pair = `${symbol}USDT`
        return { pair, limit }
    }
}

export const manualOpenTrade = async (pair: string, side: side, leverage: number, isolated: boolean, bankrollPercentage: number, limitPrice?: number, tp?: number, sl?: number) => {
    if (accounts.length === 0) return
    const market = await marketParser(pair)
    if (market?.pair) {
        let type: "market" | "limit" = "market"
        let price = limitPrice
        if (limitPrice) {
            type = "limit"
        } else {
            price = await defaultAccount.fetchTicker(market.pair).then(price => price.last)
        }
        accounts.forEach(async account => {
            try {
                if (!price) throw new Error('No price found')
                const credentials = await prisma.credentials.findFirst({ where: { api: account.api } })
                if (!credentials) return
                const size = await account.canOpenTrade(market.pair, price, market.limit, bankrollPercentage || 1, credentials)
                if (!size) return
                console.log('Enough USDT to open trade')
                await account.setLeverage(market.pair, isolated, leverage)

                await account.sendOrderOpen(market.pair, type, side, price, size, leverage, credentials, undefined, tp, sl)
            } catch (error) {
                console.log(error)
            }
        })
    } else {
        console.log(`No market for ${pair}`)
    }
}

export const signalOpenTrade = async (id: number) => {
    const trade = await prisma.positions.findUnique({ where: { id } })
    if (!trade) return
    if (accounts.length === 0) return
    const market = await marketParser(trade.symbol)
    if (market?.pair) {
        const type = "market"
        const price = await defaultAccount.fetchTicker(market.pair).then(price => price.last)
        const trader = await prisma.traders.findUnique({ where: { id: trade.traderId } })
        if (!trader) return
        accounts.forEach(async account => {
            try {
                if (!price) throw new Error('No price found')
                const credentials = await prisma.credentials.findFirst({ where: { api: account.api } })
                if (!credentials) return
                let leverage = trade.leverage
                const isolated = trader.marginMode === 'isolated' ? true : false
                if (!trader) return
                let bankrollPercentage = trader.bankrollPercentage
                if (leverage > trader.maxLeverage) {
                    console.log('Leverage is too high')
                    leverage = trader.maxLeverage
                } else if (leverage < trader.minLeverage) {
                    console.log('Leverage is too low')
                    leverage = trader.minLeverage
                }
                const size = await account.canOpenTrade(market.pair, price, market.limit, bankrollPercentage, credentials)
                if (!size) return
                console.log('Enough USDT to open trade')
                await account.setLeverage(market.pair, isolated, leverage)
                const side = trade.long ? 'sell' : 'buy'
                await account.sendOrderOpen(market.pair, type, side, price, size, leverage, credentials, trader.id)
            } catch (error) {
                console.log(error)
            }
        })
    } else {
        console.log(`No market for ${trade.symbol}`)
    }
}

export const closeTrade = async (rawPair: string, traderId?: number) => {
    const market = await marketParser(rawPair)
    if (!market) return
    accounts.forEach(async (account) => {
        try {
            const credentials = await prisma.credentials.findFirst({ where: { api: account.api } })
            if (!credentials) return
            const openTrade = await prisma.trades.findFirst({
                where: {
                    credentialId: credentials.id,
                    pair: market.pair,
                    open: true,
                    traderId
                }
            })
            if (!openTrade) return
            const side = openTrade.side === 'buy' ? 'sell' : 'buy'
            account.sendMarketClose(market.pair, side, openTrade.size)
        } catch (error) {
            console.log(error)
        }
    })
}

export const closeTradeById = async (id: number) => {
    try {
        const openTrade = await prisma.trades.findUnique({ where: { id }, include: { credentials: true } })
        if (!openTrade) return
        const accountToClose = accounts.find(account => account.api === openTrade.credentials?.api)
        if (!accountToClose) return
        const side = openTrade.side === 'buy' ? 'sell' : 'buy'
        accountToClose.sendMarketClose(openTrade.pair, side, openTrade.size)
    } catch (error) {
        console.log(error)
    }
}