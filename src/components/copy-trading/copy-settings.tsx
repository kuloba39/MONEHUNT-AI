import './copy-settings.scss';
import { useState } from 'react';
import {
    copyTradingStore,
    type CopySettings as CopySettingsType
} from '@/stores/copy-trading-store';
import { followerCopyService } from "@/services/copy-trading/follower-copy.service";


interface Props {

    traderId: number;

    traderName: string;

    settings?: CopySettingsType;

}



const CopySettings = ({
    traderId,
    traderName,
    settings
}: Props) => {


    if (!settings) {

        return null;

    }



    const [copyAmount, setCopyAmount] =
        useState(settings.amount);


    const [risk, setRisk] =
        useState(settings.risk);


    const [autoCopy, setAutoCopy] =
        useState(settings.autoCopy);


    const [stopLoss, setStopLoss] =
        useState(settings.stopLoss);


    const [takeProfit, setTakeProfit] =
        useState(settings.takeProfit);



    const handleSaveSettings = () => {


        const follower =
            copyTradingStore.followers[0];



        if (!follower) {

            console.error(
                "NO FOLLOWER ACCOUNT REGISTERED"
            );

            return;

        }



        const updatedSettings = {

            amount: copyAmount,

            risk,

            autoCopy,

            stopLoss,

            takeProfit

        };



        copyTradingStore.updateCopySettings(

            traderId,

            updatedSettings

        );



        followerCopyService.startCopy({

            masterId: traderId,

            followerId: follower.id,

            enabled: true

        });



        console.log(

            "COPY STARTED",

            {

                masterId: traderId,

                followerId: follower.id,

                traderName,

                updatedSettings

            }

        );


    };



    return (

        <div className="copy-settings">


            <h2>
                Copy Settings
            </h2>



            <p className="copy-settings__trader">

                Copying:

                <strong>
                    {traderName}
                </strong>

            </p>



            <div className="copy-settings__group">

                <label>
                    Copy Amount
                </label>


                <input

                    type="number"

                    value={copyAmount}

                    onChange={(e) =>
                        setCopyAmount(
                            Number(e.target.value)
                        )
                    }

                />

            </div>



            <div className="copy-settings__group">

                <label>
                    Risk Level
                </label>


                <select

                    value={risk}

                    onChange={(e) =>
                        setRisk(
                            e.target.value as CopySettingsType['risk']
                        )
                    }

                >

                    <option value="Low">
                        Low
                    </option>

                    <option value="Medium">
                        Medium
                    </option>

                    <option value="High">
                        High
                    </option>


                </select>

            </div>



            <div className="copy-settings__toggle">

                <label>

                    <input

                        type="checkbox"

                        checked={autoCopy}

                        onChange={(e) =>
                            setAutoCopy(
                                e.target.checked
                            )
                        }

                    />

                    Enable Auto Copy

                </label>

            </div>



            <div className="copy-settings__limits">


                <div>

                    <label>
                        Stop Loss
                    </label>


                    <input

                        type="number"

                        value={stopLoss}

                        onChange={(e) =>
                            setStopLoss(
                                Number(e.target.value)
                            )
                        }

                    />

                </div>



                <div>

                    <label>
                        Take Profit
                    </label>


                    <input

                        type="number"

                        value={takeProfit}

                        onChange={(e) =>
                            setTakeProfit(
                                Number(e.target.value)
                            )
                        }

                    />

                </div>


            </div>




            <button

                className="copy-settings__button"

                onClick={handleSaveSettings}

            >

                Save Settings

            </button>



        </div>

    );


};



export default CopySettings;