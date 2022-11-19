import { Server } from "socket.io"
import { PORT } from './config'
import { accounts, checkBalance, createAccount, loadAccounts, removeAccount } from "./controllers/account"
import { closeTrade, openTrade } from "./controllers/onTrade"
import { sendDebugMessage } from "./utils/telegram"

const startServer = async () => {
    try {
        await loadAccounts()
        console.log(await checkBalance(accounts[0], 'USDT'))
        console.log('Accounts loaded')
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
            await openTrade(trade.pair, trade.side, trade.leverage)
        } catch (error) {
            console.log(error)
        }
    })

    socket.on('closeTrade', async (trade) => {
        console.log('Nouveau Signal Clotûre', trade)
        try {
            await closeTrade(trade.pair)
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
