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

        <div className="free-bots-header">
            <h2>
                🚀 Premium Free Bots
            </h2>

            <p>
                Select a ready-made strategy and customize it in Bot Builder
            </p>
        </div>


        <div className="free-bots-grid">

        {
            FREE_BOTS.map(bot=>(

                <div
                  key={bot.id}
                  className={`free-bot-card ${bot.color}`}
                > 

                    <div className="free-bot-top">

                        <span className="bot-status">
                            FREE
                        </span>

                        <span className="bot-icon">
                             {bot.icon}
                        </span>

                    </div>


                    <span className="bot-tag">
                       {bot.tag}
                    </span>


                    <p>
                        {bot.description}
                    </p>


                    <button
                        onClick={()=>loadFreeBot(bot)}
                    >
                        Load Strategy
                    </button>


                </div>

            ))
        }

        </div>

    </div>
);
});


export default FreeBots;