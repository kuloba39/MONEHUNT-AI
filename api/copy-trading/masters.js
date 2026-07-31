let masters = [];

export default function handler(req, res) {

    if (req.method === "GET") {

        return res.status(200).json(
            masters
        );

    }


    if (req.method === "POST") {

        const master = req.body;


        if (!master) {

            return res.status(400).json({
                error: "MASTER DATA REQUIRED"
            });

        }


        const exists = masters.find(
            m => m.account_id === master.account_id
        );


        if (exists) {

            return res.status(400).json({
                error: "MASTER ALREADY REGISTERED"
            });

        }


        const newMaster = {

            ...master,

            id: Date.now(),

            followers: 0,

            createdAt: Date.now()

        };


        masters.push(newMaster);


        console.log(
            "MASTER STORED",
            newMaster
        );


        return res.status(201).json(
            newMaster
        );

    }


    return res.status(405).json({
        error: "METHOD NOT ALLOWED"
    });

}