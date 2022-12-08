import { accounts, checkBalance, setLeverage } from "./account"
import { prisma } from '../config'
import ccxt from 'ccxt'
import { sendMessage, sendDebugMessage } from '../utils/telegram'

type side = "buy" | "sell"
const defaultAccount = new ccxt.bybit()

export const openTrade = async (rawPair: string, side: side, tradeLeverage: number) => {
    if (accounts.length > 0) {
        const symbol = rawPair.split('USDT')[0].split('BUSD')[0]
        const marketIndex = `${symbol}/USDT:USDT`
        const markets = await defaultAccount.loadMarkets()
        const market = markets[marketIndex]
        if (market) {
            const limit = Number(market?.limits?.amount?.min)
            const pair = `${symbol}USDT`
            accounts.map(async (account) => {
                try {
                    const credentials = await prisma.credentials.findFirst({ where: { api: account.apiKey } })
                    if (!credentials) return
                    const openTrades = await prisma.trades.findMany({
                        where: {
                            credentialId: Number(credentials.id),
                            pair,
                            open: true
                        }
                    })
                    if (openTrades.length > 0) {
                        console.log('Trade already open on this pair')
                        return
                    }
                    const usdtBalance = await checkBalance(account, 'USDT')
                    const bankrollSize = credentials.bankrollPercentage / 100
                    const positionSize = usdtBalance.total * bankrollSize
                    const price = await defaultAccount.fetchTicker(pair)
                    const quantity = Number((positionSize / Number(price.last)).toFixed(3))
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

                    const trade = await account.createMarketOrder(pair, side, quantity * leverage)
                    await prisma.trades.create({
                        data: {
                            pair,
                            leverage,
                            size: trade.amount,
                            entryPrice: Number(price.last),
                            side,
                            credentialId: credentials.id
                        }
                    })
                    console.log('trade open')
                    sendMessage(`Ouverture de trade !%0ACompte: ${credentials.name}%0ACrypto: ${pair}%0ATrade: ${side === 'buy' ? 'LONG 🟢' : 'SHORT 🔴'} x${leverage}%0APrix d'entrée: ${price.last}$`)
                } catch (error) {
                    console.log(error)
                }
            })
        } else {
            console.log(`No market for ${rawPair}`)
            sendDebugMessage(`No market for ${rawPair}`)
            return
        }
    }
}

export const closeTrade = async (rawPair: string) => {
    const symbol = rawPair.split('USDT')[0].split('BUSD')[0]
    const pair = `${symbol}USDT`
    accounts.map(async (account) => {
        try {
            const credentials = await prisma.credentials.findFirst({ where: { api: account.apiKey } })
            if (!credentials) return
            const openTrades = await prisma.trades.findMany({
                where: {
                    credentialId: Number(credentials.id),
                    pair,
                    open: true
                }
            })
            if (openTrades.length > 0) {
                const price = await defaultAccount.fetchTicker(pair)
                const openTrade = openTrades[0]
                const side = openTrade.side === 'buy' ? 'sell' : 'buy'
                await account.createMarketOrder(pair, side, openTrade.size, undefined, { reduce_only: true })
                let percent = (Number(price.last) - openTrade.entryPrice) / Number(price.last) * 100 * openTrade.leverage
                const fees = openTrade.size * openTrade.entryPrice * 0.0006 + openTrade.size * Number(price.last) * 0.0006
                if (side === 'buy') {
                    percent = -percent
                }
                const pnl = openTrade.size / openTrade.leverage * openTrade.entryPrice * percent / 100 - fees
                const win = percent > 0 ? true : false
                await prisma.trades.update({
                    where: { id: openTrade.id },
                    data: {
                        open: false,
                        closingPrice: Number(price.last),
                        percent,
                        win,
                        updatedAt: new Date(Date.now())
                    }
                })
                console.log('trade closed')
                sendMessage(`Clotûre de trade ! ${win ? '✅' : '❌'}%0ACrypto: ${openTrade.pair}%0ATrade: ${openTrade.side === 'buy' ? 'LONG 🟢' : 'SHORT 🔴'} x${openTrade.leverage}%0APrix d'entrée: ${openTrade.entryPrice}$%0APrix de clôture: ${price.last}$%0APNL: ${pnl.toFixed(2)}$%0A${win ? 'Gain' : 'Perte'}: ${percent.toFixed(2)}%`)
            }
        } catch (error) {
            console.log(error)
        }
    })
}