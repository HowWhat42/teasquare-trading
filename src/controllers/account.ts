import { credentials, trades } from '@prisma/client'
import ccxt, { BadRequest } from 'ccxt'
import { prisma } from '../config'
import { updateDailyCell } from '../utils/googleapi'
import { sendMessage } from '../utils/telegram'

export let accounts: Account[] = []

export class Account {
    api: string
    secret: string
    bybit: ccxt.pro.bybit
    credentials: credentials
    constructor(api: string, secret: string, credentials: credentials) {
        this.api = api
        this.secret = secret
        this.credentials = credentials
        this.bybit = new ccxt.pro.bybit({ apiKey: this.api, secret: this.secret })
        accounts.push(this)
    }

    delete() {
        accounts = accounts.filter(account => account.api !== this.api)
    }

    async checkBalance(symbol: string) {
        try {
            const balances = await this.bybit.fetchBalance()
            return balances[symbol]
        } catch (error) {
            throw error
        }
    }

    async setLeverage(symbol: string, isolated: boolean, value: number) {
        try {
            await this.bybit.privatePostPrivateLinearPositionSwitchMode({ symbol, mode: 'BothSide' })
        } catch (error: any) {
            if (error.message.includes('position mode not modified')) {
                console.log('Position mode not modified')
            } else {
                throw new BadRequest(error.message)
            }
        }
        try {
            await this.bybit.privatePostPrivateLinearPositionSwitchIsolated({ symbol, is_isolated: isolated, buy_leverage: value, sell_leverage: value })
        } catch (error: any) {
            if (error.message.includes('Isolated not modified')) {
                console.log('Isolated not modified')
            } else {
                throw new BadRequest(error.message)
            }
        }
    }

    async watchTrades() {
        let isOn = false
        do {
            try {
                const accountIndex = accounts.indexOf(this)
                if (accountIndex !== -1) {
                    isOn = true
                } else {
                    break
                }
                const trades = await accounts[accountIndex].bybit.watchMyTrades()

                this.handleTrade(trades[0])
            } catch (error) {
                console.log(error)
            }
        } while (isOn)
    }

    async handleTrade(trade: ccxt.Trade) {
        const closeSide = trade.side === "buy" ? "sell" : "buy"
        const openTrade = await prisma.trades.findFirst({ where: { credentials: { api: this.api }, side: closeSide, pair: trade.info.symbol, open: true }, include: { credentials: true } })
        if (!openTrade) return
        this.onClose(trade, openTrade)
    }

    async canOpenTrade(symbol: string, price: number, limit: number, bankrollPercentage: number, credentials: credentials) {
        const openTrades = await prisma.trades.findMany({
            where: {
                credentialId: +credentials.id,
                pair: symbol,
                open: true,
            }
        })
        if (openTrades.length > 0) {
            console.log('Trade already open on this pair with this trader')
            return false
        }
        const usdtBalance = await this.checkBalance('USDT')
        const bankrollSize = bankrollPercentage / 100
        const positionSize = usdtBalance.total * bankrollSize
        const quantity = Math.floor(positionSize / price * 1000) / 1000
        if (positionSize > usdtBalance.free) {
            console.log('Not enough USDT to open trade')
            return false
        }
        if (quantity < limit) {
            console.log('Quantity is under limit')
            return false
        }
        return quantity
    }

    async sendOrderOpen(pair: string, type: "market" | "limit", side: "buy" | "sell", price: number, size: number, leverage: number, credentials: credentials, traderId?: number, tp?: number, sl?: number) {
        try {
            const orderPrice = type === "market" ? undefined : price
            let order
            if (tp && sl) {
                order = await this.bybit.createOrder(pair, type, side, size * leverage, orderPrice, { take_profit: tp, stop_loss: sl })
            } else {
                order = await this.bybit.createOrder(pair, type, side, size * leverage, orderPrice)
            }
            const savedTrade = await prisma.trades.create({
                data: {
                    pair,
                    leverage,
                    size: order.amount,
                    entryPrice: price,
                    side,
                    credentialId: credentials.id,
                    traderId
                },
                include: {
                    credentials: true
                }
            })
            console.log('trade sent')
            this.onFilled(order, savedTrade)
        } catch (error) {
            console.log(error)
        }
    }

    async onFilled(baseOrder: ccxt.Order, openTrade: (trades & { credentials: credentials | null })) {
        if (!openTrade.credentials) return
        try {
            let order = baseOrder
            while (order.status === "open") {
                try {
                    order = await this.bybit.fetchOrder(order.id, order.symbol)
                } catch {
                    console.log(`Order ${order.id} not found`)
                }
            }
            const updatedTrade = await prisma.trades.update({
                where: {
                    id: openTrade.id
                },
                data: {
                    size: order.amount,
                    entryPrice: order.average,
                    status: "filled",
                    updatedAt: new Date(Date.now())
                }
            })
            console.log('trade filled')
            sendMessage(`Ouverture de trade !%0ACompte: ${openTrade.credentials.name}%0ACrypto: ${openTrade.pair}%0ATrade: ${openTrade.side === 'buy' ? 'LONG 🟢' : 'SHORT 🔴'} x${openTrade.leverage}%0APrix d'entrée: ${updatedTrade.entryPrice}$`)
        } catch (error) {
            console.log(error)
        }
    }

    async sendMarketClose(pair: string, side: "buy" | "sell", size: number) {
        try {
            await this.bybit.createMarketOrder(pair, side, size, undefined, { reduce_only: true })
        } catch (error) {
            console.log(error)
        }
    }


    async onClose(trade: ccxt.Trade, openTrade: (trades & { credentials: credentials | null })) {
        if (!openTrade.credentials) return
        let percent = (trade.price - openTrade.entryPrice) / trade.price * 100 * openTrade.leverage
        if (trade.side === 'buy') {
            percent = -percent
        }
        const pnl = trade.amount / openTrade.leverage * openTrade.entryPrice * percent / 100 - trade.fee.cost
        const win = pnl > 0 ? true : false
        await prisma.trades.update({
            where: {
                id: openTrade.id
            },
            data: {
                open: false,
                closingPrice: trade.price,
                percent,
                win,
                size: trade.amount,
                status: "closed",
                updatedAt: new Date(Date.now())
            }
        })

        const sideText = openTrade.side === 'buy' ? 'LONG 🟢' : 'SHORT 🔴'
        console.log('trade closed')
        sendMessage(`Clotûre de trade ! ${win ? '✅' : '❌'}%0ACompte: ${openTrade.credentials.name}%0ACrypto: ${openTrade.pair}%0ATrade: ${sideText} x${openTrade.leverage}%0APrix d'entrée: ${openTrade.entryPrice}$%0APrix de clôture: ${trade.price}$%0APNL: ${pnl.toFixed(2)}$%0A${win ? 'Gain' : 'Perte'}: ${percent.toFixed(2)}%`)
        // if (openTrade.credentials.name === "TheBilster") {
        //     await updateDailyCell((percent / 100) * (openTrade.credentials.bankrollPercentage / 100))
        // }
    }
}