import './copy-trading.scss';

import {
    saveAccount,
    saveMaster
} from "@/services/copy-trading/copy-storage";


const CopyTrading = () => {


const setMasterAccount = () => {


    const account = {

        id: crypto.randomUUID(),

        loginid: "CONNECTED_DERIV_ACCOUNT",

        currency: "USD",

        role: "master" as const,

        connectedAt: Date.now()

    };


    saveAccount(account);


    saveMaster({

        id: crypto.randomUUID(),

        accountId: account.id,

        displayName: "D CIRCLES AI",

        followers: 0,

        totalProfit: 0,

        winRate: 0,

        status: "active"

    });


    alert(
        "Account registered as Master Trader"
    );


};



const setFollowerAccount = () => {


    const account = {

        id: crypto.randomUUID(),

        loginid: "FOLLOWER_DERIV_ACCOUNT",

        currency: "USD",

        role: "follower" as const,

        connectedAt: Date.now()

    };


    saveAccount(account);


    alert(
        "Account registered as Follower"
    );


};



return (

<div className="copy-trading-page">


<h1>
COPY TRADING
</h1>


<div className="copy-card">


<h2>
D CIRCLES MASTER
</h2>


<div className="copy-status">
READY
</div>


<div className="copy-info">


<div>
MASTER TRADES
<strong>
0
</strong>
</div>


<div>
FOLLOWERS
<strong>
0
</strong>
</div>


<div>
PROFIT
<strong>
$0.00
</strong>
</div>


</div>


<button onClick={setMasterAccount}>
BECOME MASTER
</button>


<button onClick={setFollowerAccount}>
FOLLOW MASTER
</button>


</div>


</div>

);


};


export default CopyTrading;