import { LogTypes } from '../../../constants/messages';
import { api_base } from '../../api/api-base';
import { contractStatus, info, log } from '../utils/broadcast';
import { doUntilDone, getUUID, recoverFromError, tradeOptionToBuy } from '../utils/helpers';
import { purchaseSuccessful } from './state/actions';
import { BEFORE_PURCHASE } from './state/constants';
import { tradeReplicationService } from '@/services/trade-replication.service';

let delayIndex = 0;
let purchase_reference;

export default Engine =>
    class Purchase extends Engine {

        purchase(contract_type) {

            // Prevent duplicate purchase
            if (this.store.getState().scope !== BEFORE_PURCHASE) {
                return Promise.resolve();
            }


            const onSuccess = response => {

                const { buy } = response;


                contractStatus({
                    id: 'contract.purchase_received',
                    data: buy.transaction_id,
                    buy,
                });


                this.contractId = buy.contract_id;


                this.store.dispatch(
                    purchaseSuccessful()
                );



                /*
                    MASTER COPY TRADING BROADCAST

                    Every successful bot trade
                    becomes available for followers.
                */

                try {


                    const copiedTrade = {

                        trade_id:
                            String(
                                buy.transaction_id
                            ),


                        master_id:
                            this.master_id ||
                            1,


                        symbol:
                            this.tradeOptions.symbol ||
                            this.tradeOptions.underlying_symbol ||
                            "",


                        contract_type,


                        amount:
                            Number(
                                buy.buy_price ||
                                this.tradeOptions.amount ||
                                0
                            ),


                        duration:
                            this.tradeOptions.duration ||
                            1,


                        duration_unit:
                            this.tradeOptions.duration_unit ||
                            "t",


                        barrier:
                            this.tradeOptions.barrier,


                        currency:
                            this.tradeOptions.currency ||
                            "USD",


                        basis:
                            this.tradeOptions.basis ||
                            "stake",


                        timestamp:
                            Date.now()

                    };



                    tradeReplicationService.replicateTrade(
                        copiedTrade
                    );



                    console.log(
                        "MASTER TRADE BROADCAST",
                        copiedTrade
                    );


                } catch(error){


                    console.error(
                        "COPY TRADING BROADCAST FAILED",
                        error
                    );


                }





                if (
                    this.is_proposal_subscription_required
                ) {

                    this.renewProposalsOnPurchase();

                }



                delayIndex = 0;



                log(
                    LogTypes.PURCHASE,
                    {
                        transaction_id:
                            buy.transaction_id
                    }
                );



                info({

                    accountID:
                        this.accountInfo.loginid,


                    totalRuns:
                        this.updateAndReturnTotalRuns(),


                    transaction_ids:
                        {
                            buy:
                                buy.transaction_id
                        },


                    contract_type,


                    buy_price:
                        buy.buy_price

                });


            };






            /*
                PROPOSAL BASED PURCHASE
            */


            if (
                this.is_proposal_subscription_required
            ) {


                const {
                    id,
                    askPrice
                } =
                this.selectProposal(
                    contract_type
                );



                const action = () =>
                    api_base.api.send({

                        buy:id,

                        price:askPrice

                    });



                this.isSold = false;



                contractStatus({

                    id:
                    'contract.purchase_sent',


                    data:
                    askPrice

                });



                if(
                    !this.options.timeMachineEnabled
                ){

                    return doUntilDone(action)
                        .then(onSuccess);

                }



                return recoverFromError(

                    action,


                    (errorCode, makeDelay)=>{


                        if(
                            errorCode !==
                            'DisconnectError'
                        ){

                            this.renewProposalsOnPurchase();

                        }
                        else {

                            this.clearProposals();

                        }



                        const unsubscribe =
                        this.store.subscribe(()=>{


                            const {
                                scope,
                                proposalsReady
                            } =
                            this.store.getState();



                            if(
                                scope === BEFORE_PURCHASE &&
                                proposalsReady
                            ){

                                makeDelay()
                                .then(()=>
                                    this.observer.emit(
                                        'REVERT',
                                        'before'
                                    )
                                );


                                unsubscribe();

                            }


                        });


                    },


                    [
                        'PriceMoved',
                        'InvalidContractProposal'
                    ],


                    delayIndex++

                )
                .then(onSuccess);

            }






            /*
                NORMAL PURCHASE
            */


            const trade_option =
                tradeOptionToBuy(
                    contract_type,
                    this.tradeOptions
                );



            const action = () =>
                api_base.api.send(
                    trade_option
                );



            this.isSold = false;



            contractStatus({

                id:
                'contract.purchase_sent',


                data:
                this.tradeOptions.amount

            });





            if(
                !this.options.timeMachineEnabled
            ){

                return doUntilDone(action)
                    .then(onSuccess);

            }






            return recoverFromError(

                action,


                (errorCode, makeDelay)=>{


                    if(
                        errorCode ===
                        'DisconnectError'
                    ){

                        this.clearProposals();

                    }



                    const unsubscribe =
                    this.store.subscribe(()=>{


                        const {
                            scope
                        } =
                        this.store.getState();



                        if(
                            scope === BEFORE_PURCHASE
                        ){

                            makeDelay()
                            .then(()=>
                                this.observer.emit(
                                    'REVERT',
                                    'before'
                                )
                            );


                            unsubscribe();

                        }


                    });


                },


                [
                    'PriceMoved',
                    'InvalidContractProposal'
                ],


                delayIndex++


            )
            .then(onSuccess);

        }





        getPurchaseReference = () =>
            purchase_reference;



        regeneratePurchaseReference = () => {

            purchase_reference =
                getUUID();

        };


    };