import { followerDerivConnection } from './follower-deriv-connection.service';

export interface ReplicatedTrade {
    trade_id: string;
    master_id: number;
    symbol: string;
    contract_type: string;
    amount: number;
    duration: number;
    duration_unit: string;
    barrier?: string | number;
    currency: string;
    basis: string;
    timestamp: number;
}

interface ConnectedClient {
    id: number;
    accountId: string;
    status: 'connected' | 'disconnected';
}

class TradeReplicationService {

    private clients: ConnectedClient[] = [];

    getClients() {
        return this.clients;
    }

    connectClient(
        id: number,
        accountId: string
    ) {

        const existing =
            this.clients.find(
                client => client.id === id
            );

        if (existing) {

            existing.status = 'connected';

            return existing;

        }

        const client: ConnectedClient = {

            id,

            accountId,

            status: 'connected'

        };

        this.clients.push(client);

        console.log(
            'COPY TRADING CLIENT CONNECTED',
            client
        );

        return client;

    }

    disconnectClient(
        id: number
    ) {

        const client =
            this.clients.find(
                item => item.id === id
            );

        if (!client) {
            return;
        }

        client.status = 'disconnected';

        console.log(
            'COPY TRADING CLIENT DISCONNECTED',
            client
        );

    }

    async replicateTrade(
        trade: ReplicatedTrade
    ) {

        const connectedClients =
            this.clients.filter(
                client =>
                    client.status === 'connected'
            );

        console.log(
            'MASTER TRADE REPLICATION',
            {
                trade,
                clients:
                    connectedClients.length
            }
        );

        for (
            const client
            of connectedClients
        ) {

            try {

                await this.executeTrade(
                    client,
                    trade
                );

            } catch (error) {

                console.error(
                    'COPY TRADE FAILED',
                    {
                        client,
                        trade,
                        error
                    }
                );

            }

        }

    }

    private async executeTrade(
        client: ConnectedClient,
        trade: ReplicatedTrade
    ) {

        const api =
            followerDerivConnection
                .getConnection(client.id);

        if (!api) {

            console.log(
                'CLIENT NOT CONNECTED',
                client.id
            );

            return;

        }

        const proposal =
            await api.proposal({

                amount:
                    trade.amount,

                basis:
                    trade.basis,

                contract_type:
                    trade.contract_type,

                currency:
                    trade.currency,

                duration:
                    trade.duration,

                duration_unit:
                    trade.duration_unit,

                underlying_symbol:
                    trade.symbol,

                barrier:
                    trade.barrier

            });

        if (proposal.error) {

            console.error(
                'COPY TRADE PROPOSAL ERROR',
                {
                    clientId: client.id,
                    error: proposal.error
                }
            );

            return;

        }

        const buy =
            await api.buy({

                buy:
                    proposal.proposal.id,

                price:
                    trade.amount

            });

        console.log(
            'TRADE REPLICATED',
            {
                clientId:
                    client.id,

                accountId:
                    client.accountId,

                transactionId:
                    buy?.buy?.transaction_id,

                trade
            }
        );

    }

}

export const tradeReplicationService =
    new TradeReplicationService();