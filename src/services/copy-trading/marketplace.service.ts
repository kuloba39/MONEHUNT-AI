import axios from "axios";


const API =
"/api/copy-trading";


export const marketplaceService = {


    async getMasters(){


        const response =
        await axios.get(
            `${API}/masters`
        );


        return response.data;


    },





    async registerMaster(
        master:any
    ){


        const response =
        await axios.post(

            `${API}/masters`,

            master

        );


        return response.data;


    }



};