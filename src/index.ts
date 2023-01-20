import { credentials } from "@prisma/client"
import { Server } from "socket.io"
import { PORT, prisma } from './config'
import { accounts, Account } from "./controllers/account"
import { closeTrade, signalOpenTrade, manualOpenTrade, closeTradeById } from "./controllers/onTrade"
import { sendDebugMessage } from "./utils/telegram"

const startServer = async () => {
    try {
        const credentials = await prisma.credentials.findMany({ where: { active: true } })
        credentials.map(async (credential: credentials) => {
            new Account(credential.api, credential.secret, credential)
        })
        console.log('Accounts loaded')
        accounts.forEach(account => account.watchTrades())
        // await setLeverage(accounts[1], 'OCEANUSDT', 4)
        // const positions = await accounts[1].privateGetPrivateLinearPositionList({ symbol: 'ICPUSDT' })
        // console.log(positions)
        // const balance = await accounts[1].privateGetV2PrivateWalletBalance({ coin: 'USDT' })
        // console.log(balance)
        // accounts.map(async (account) => console.log(account.apiKey, await checkBalance(account, 'USDT')))
        // console.log(accounts[8].apiKey)
        // console.log(await accounts[8].fetchOrders('BNBUSDT'))
        // const positions = await accounts[8].fetchPositions()
        // const filteredPos = positions.filter((position: any) => position.contracts > 0)
        // console.log(filteredPos.map((pos: any) => {
        //     return {
        //         symbol: pos.info.symbol,
        //         size: pos.info.size,
        //         leverage: pos.info.leverage,
        //         value: pos.info.position_value
        //     }
        // }))
    } catch (error) {
        console.log(error)
    }
}
startServer()

const io = new Server()
io.listen(PORT)

io.on('connection', (socket) => {
    console.log(`connect ${socket.id}`)
    sendDebugMessage(`connect ${socket.id}`)

    socket.on("disconnect", (reason) => {
        console.log(`disconnect ${socket.id} due to ${reason}`)
        sendDebugMessage(`disconnect ${socket.id} due to ${reason}`)
    })

    socket.on('message', (msg: string) => {
        console.log(msg)
    })

    socket.on('manualOpenTrade', async (trade) => {
        console.log('Nouveau Signal Ouverture', trade)
        try {
            await manualOpenTrade(trade.pair, trade.side, trade.leverage, trade.isolated, trade.bankrollPercentage, trade?.limitPrice, trade?.tp, trade?.sl)
        } catch (error) {
            console.log(error)
        }
    })

    socket.on('signalOpenTrade', async (trade) => {
        console.log('Nouveau Signal Ouverture', trade)
        try {
            await signalOpenTrade(+trade.id)
        } catch (error) {
            console.log(error)
        }
    })

    socket.on('manualCloseTrade', async (trade) => {
        console.log('Nouveau Signal Clotûre', trade)
        try {
            await closeTradeById(+trade.id)
        } catch (error) {
            console.log(error)
        }
    })

    socket.on('closeTrade', async (trade) => {
        console.log('Nouveau Signal Clotûre', trade)
        try {
            await closeTrade(trade.pair, trade?.traderId)
        } catch (error) {
            console.log(error)
        }
    })

    socket.on('addAccount', async (account) => {
        console.log('Nouveau compte', account)
        sendDebugMessage(`Nouveau compte`)
        const credential = await prisma.credentials.findFirst({ where: { api: account.api } })
        if (!credential) return
        new Account(account.api, account.secret, credential)
    })

    socket.on('deleteAccount', (account) => {
        console.log('Suppression compte', account)
        sendDebugMessage(`Suppression compte`)
        const accountToDelete = accounts.find(a => a.api === account.api)
        if (accountToDelete) {
            accountToDelete.delete()
        }
    })
})
