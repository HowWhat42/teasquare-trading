import { Server } from "socket.io"
import { PORT } from './config'
import { createAccount, loadAccounts, removeAccount } from "./controllers/account"
import { closeTrade, openTrade } from "./controllers/onTrade"

const startServer = async () => {
    try {
        await loadAccounts()
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

    socket.on("disconnect", (reason) => {
        console.log(`disconnect ${socket.id} due to ${reason}`)
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
        createAccount(account.api, account.secret)
    })

    socket.on('deleteAccount', (account) => {
        console.log('Suppression compte', account)
        removeAccount(account.api)
    })
})
