import { accounts, checkBalance, setLeverage } from "./account"
import { prisma } from '../config'

type side = "buy" | "sell"

export const openTrade = async (rawPair: string, side: side, tradeLeverage: number) => {
    const symbol = rawPair.split('USDT')[0].split('BUSD')[0]
    const marketIndex = `${symbol}/USDT:USDT`
    const markets = await accounts[0].loadMarkets()
    const market = markets[marketIndex]
    if (market) {
        const limit = Number(market?.limits?.amount?.min)
        const pair = `${symbol}USDT`
        accounts.map(async (account) => {
            try {
                const credentials = await prisma.credentials.findMany({ where: { api: account.apiKey } })
                const openTrades = await prisma.trades.findMany({
                    where: {
                        credentialId: Number(credentials[0].id),
                        pair,
                        open: true
                    }
                })
                if (openTrades.length > 0) {
                    console.log('Trade already open')
                    return
                }
                const usdtBalance = await checkBalance(account, 'USDT')
                const bankrollSize = credentials[0].bankrollPercentage / 100
                const price = await accounts[0].fetchTicker(pair)
                const quantity = Number((usdtBalance.free * bankrollSize / Number(price.last)).toFixed(3))
                if (quantity <= limit) {
                    console.log('USDT is not enough to open trade')
                    return
                }
                console.log('USDT is enough to open trade')
                let leverage = tradeLeverage
                if (tradeLeverage > credentials[0].maxLeverage) {
                    console.log('Leverage is too high')
                    leverage = credentials[0].maxLeverage
                }
                await setLeverage(account, pair, leverage)

                const trade = await account.createMarketOrder(pair, side, quantity)
                await prisma.trades.create({
                    data: {
                        pair,
                        leverage,
                        size: trade.amount,
                        entryPrice: Number(price.last),
                        side,
                        credentialId: credentials[0].id
                    }
                })
                console.log('trade open')
            } catch (error) {
                throw error
            }
        })
    } else {
        console.log(`No market for ${rawPair}`)
        return
    }
}

export const closeTrade = async (rawPair: string) => {
    const symbol = rawPair.split('USDT')[0].split('BUSD')[0]
    const pair = `${symbol}USDT`
    accounts.map(async (account) => {
        try {
            const credentials = await prisma.credentials.findMany({ where: { api: account.apiKey } })
            const openTrades = await prisma.trades.findMany({
                where: {
                    credentialId: Number(credentials[0].id),
                    pair,
                    open: true
                }
            })
            if (openTrades.length > 0) {
                const price = await accounts[0].fetchTicker(pair)
                const openTrade = openTrades[0]
                const side = openTrade.side === 'buy' ? 'sell' : 'buy'
                await account.createMarketOrder(pair, side, openTrade.size, undefined, { reduce_only: true })
                let percent = (Number(price.last) - openTrade.entryPrice) / Number(price.last) * 100
                if (side === 'buy') {
                    percent = -percent
                }
                const win = percent > 0 ? true : false
                await prisma.trades.update({
                    where: { id: openTrade.id },
                    data: {
                        open: false,
                        closingPrice: Number(price.last),
                        percent,
                        win
                    }
                })
                console.log('trade closed')
            }
        } catch (error) {
            throw error
        }
    })
}