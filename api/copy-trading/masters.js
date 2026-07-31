import { Redis } from "@upstash/redis";


const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});


const MASTER_KEY = "copy_trading_masters";



export default async function handler(req, res) {


    // GET ALL MASTERS
    if (req.method === "GET") {

        try {

            const masters =
                await redis.get(MASTER_KEY) || [];


            return res.status(200).json(masters);


        } catch(error) {

            console.error(
                "GET MASTERS ERROR",
                error
            );


            return res.status(500).json({
                error:"FAILED TO LOAD MASTERS"
            });

        }

    }



    // REGISTER MASTER
    if (req.method === "POST") {


        try {


            const master = req.body;


            if (!master) {

                return res.status(400).json({
                    error:"MASTER DATA REQUIRED"
                });

            }



            const masters =
                await redis.get(MASTER_KEY) || [];




            const exists =
                masters.find(
                    m =>
                    m.account_id === master.account_id
                );



            if (exists) {

                return res.status(400).json({
                    error:"MASTER ALREADY REGISTERED"
                });

            }




            const newMaster = {

    id: Date.now(),

    name: master.name,

    account_id: master.account_id,


    avatar:
    master.avatar || "",


    country:
    master.country || "Unknown",


    strategy:
    master.strategy || "AI Trading",


    profit:
    master.profit || "0",


    monthlyProfit:
    master.monthlyProfit || "0",


    roi:
    master.roi || "0",


    winRate:
    master.winRate || "0",


    totalTrades:
    master.totalTrades || 0,


    wins:
    master.wins || 0,


    losses:
    master.losses || 0,


    drawdown:
    master.drawdown || "0",


    risk:
    master.risk || "medium",


    followers:0,


    balance:
    master.balance || 0,


    experience:
    master.experience || "new",


    markets:
    master.markets || [],


    contracts:
    master.contracts || [],


    status:"active",


    verified:false,


    profitHistory:[],


    tradeHistory:[],


    copySettings:
    master.copySettings || {},


    createdAt:Date.now()

};




            masters.push(newMaster);



            await redis.set(
                MASTER_KEY,
                masters
            );




            console.log(
                "MASTER STORED",
                newMaster
            );



            return res.status(201).json(
                newMaster
            );



        } catch(error) {


            console.error(
                "REGISTER MASTER ERROR",
                error
            );


            return res.status(500).json({
                error:"FAILED TO REGISTER MASTER"
            });


        }


    }




    return res.status(405).json({
        error:"METHOD NOT ALLOWED"
    });


}