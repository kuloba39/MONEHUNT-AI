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

                ...master,

                id: Date.now(),

                followers:0,

                status:"active",

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