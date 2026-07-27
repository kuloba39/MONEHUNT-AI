import React from 'react';
import { observer } from 'mobx-react-lite';
import { FREE_BOTS } from '@/constants/free-bots';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import './free-bots.scss';

const FreeBots = observer(() => {

    const { load_modal, blockly_store, dashboard } = useStore();

    const { setSelectedStrategyId } = load_modal;

    const { setLoading } = blockly_store;


    const loadFreeBot = async (bot:any)=>{

        console.log("FREE BOT SELECTED", bot);

        setSelectedStrategyId(bot.id);

        setLoading(true);

        try {

            if (bot.xml) {

                const xmlDom =
                    window.Blockly.utils.xml.textToDom(bot.xml);

                window.Blockly.Xml.clearWorkspaceAndLoadFromXml(
                    xmlDom,
                    window.Blockly.derivWorkspace
                );
                // Open Bot Builder after loading free bot
                   dashboard.setActiveTab(DBOT_TABS.BOT_BUILDER);

            } else {

                console.warn(
                    "FREE BOT XML EMPTY",
                    bot.id
                );

            }

        } catch(error){

            console.error(
                "FREE BOT LOAD ERROR",
                error
            );

        }

        setLoading(false);

    };


    return (
        <div className="free-bots">

            {
                FREE_BOTS.map(bot=>(

                    <div
                    key={bot.id}
                    className="free-bot-card"
                    onClick={()=>loadFreeBot(bot)}
                    >

                        <h3>
                            {bot.name}
                        </h3>

                        <p>
                            {bot.description}
                        </p>

                        <button>
                            Load Bot
                        </button>

                    </div>

                ))
            }

        </div>
    );
});


export default FreeBots;