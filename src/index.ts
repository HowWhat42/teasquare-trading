import { Server } from "socket.io"
import { PORT } from './config'
import { createAccount, loadAccounts, removeAccount, checkBalance, accounts, setLeverage, watchTrades } from "./controllers/account"
import { closeTrade, openTrade } from "./controllers/onTrade"
import { sendDebugMessage } from "./utils/telegram"

const startServer = async () => {
    try {
        await loadAccounts()
        console.log('Accounts loaded')
        accounts.map(account => watchTrades(account))
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

    socket.on('openTrade', async (trade) => {
        console.log('Nouveau Signal Ouverture', trade)
        try {
            await openTrade(trade.pair, trade.side, trade.leverage, trade.traderId)
        } catch (error) {
            console.log(error)
        }
    })

    socket.on('closeTrade', async (trade) => {
        console.log('Nouveau Signal Clotûre', trade)
        try {
            await closeTrade(trade.pair, trade.traderId)
        } catch (error) {
            console.log(error)
        }
    })

    socket.on('addAccount', (account) => {
        console.log('Nouveau compte', account)
        sendDebugMessage(`Nouveau compte`)
        createAccount(account.api, account.secret)
    })

    socket.on('deleteAccount', (account) => {
        console.log('Suppression compte', account)
        sendDebugMessage(`Suppression compte`)
        removeAccount(account.api)
    })
})
