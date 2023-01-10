import { accounts, checkBalance, newTrade, setLeverage } from "./account"
import { prisma } from '../config'
import ccxt from 'ccxt'
import { sendMessage } from "../utils/telegram"

type side = "buy" | "sell"
const defaultAccount = new ccxt.bybit()

export const openTrade = async (rawPair: string, side: side, tradeLeverage: number, traderId: number) => {
    if (accounts.length > 0) {
        const symbol = rawPair.split('USDT')[0].split('BUSD')[0]
        const marketIndex = `${symbol}/USDT:USDT`
        const markets = await defaultAccount.loadMarkets()
        const market = markets[marketIndex]
        if (market) {
            const limit = Number(market?.limits?.amount?.min)
            const pair = `${symbol}USDT`
            const orders = accounts.map(async (account) => {
                try {
                    const credentials = await prisma.credentials.findFirst({ where: { api: account.apiKey } })
                    if (!credentials) return
                    const openTrades = await prisma.trades.findMany({
                        where: {
                            credentialId: Number(credentials.id),
                            pair,
                            open: true,
                        }
                    })
                    if (openTrades.length > 0) {
                        console.log('Trade already open on this pair with this trader')
                        return
                    }
                    const usdtBalance = await checkBalance(account, 'USDT')
                    const bankrollSize = credentials.bankrollPercentage / 100
                    const positionSize = usdtBalance.total * bankrollSize
                    const price = await defaultAccount.fetchTicker(pair)
                    if (!price.last) return
                    const quantity = Number((positionSize / price.last).toFixed(3))
                    if (positionSize > usdtBalance.free) {
                        console.log('Not enough USDT to open trade')
                        return
                    }
                    if (quantity < limit) {
                        console.log('Quantity is under limit')
                        return
                    }
                    console.log('Enough USDT to open trade')
                    let leverage = tradeLeverage
                    if (tradeLeverage > credentials.maxLeverage) {
                        console.log('Leverage is too high')
                        leverage = credentials.maxLeverage
                    }
                    await setLeverage(account, pair, leverage)

                    const order = await account.createMarketOrder(pair, side, quantity * leverage)
                    const savedTrade = await prisma.trades.create({
                        data: {
                            pair,
                            leverage,
                            size: order.amount,
                            entryPrice: price.last,
                            side,
                            credentialId: credentials.id,
                            traderId
                        },
                        include: {
                            credentials: true
                        }
                    })
                    await newTrade(account, order, savedTrade)
                    console.log('trade sent')
                    sendMessage(`Ouverture de trade !%0ACompte: ${credentials.name}%0ACrypto: ${savedTrade.pair}%0ATrade: ${savedTrade.side === 'buy' ? 'LONG 🟢' : 'SHORT 🔴'} x${savedTrade.leverage}%0APrix d'entrée: ${savedTrade.entryPrice}$`)
                } catch (error) {
                    console.log(error)
                }
            })
            await Promise.all(orders)
        } else {
            console.log(`No market for ${rawPair}`)
            return
        }
    }
}

export const closeTrade = async (rawPair: string, traderId: number) => {
    const symbol = rawPair.split('USDT')[0].split('BUSD')[0]
    const pair = `${symbol}USDT`
    const orders = accounts.map(async (account) => {
        try {
            const credentials = await prisma.credentials.findFirst({ where: { api: account.apiKey } })
            if (!credentials) return
            const price = await defaultAccount.fetchTicker(pair)
            if (!price.last) return
            const openTrades = await prisma.trades.findMany({
                where: {
                    credentialId: credentials.id,
                    pair,
                    open: true,
                    traderId
                }
            })
            if (openTrades.length > 0) {
                const openTrade = openTrades[0]
                const side = openTrade.side === 'buy' ? 'sell' : 'buy'
                await account.createMarketOrder(pair, side, openTrade.size, undefined, { reduce_only: true })
            }
        } catch (error) {
            console.log(error)
        }
    })
    await Promise.all(orders)
}