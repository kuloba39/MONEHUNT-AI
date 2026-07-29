import './copy-trading.scss';


const CopyTrading = () => {


return (

<div className="copy-trading-panel">


<div className="copy-title">
COPY TRADING
</div>


<div className="copy-row">

<span>
MASTER SIGNAL
</span>

<strong>
D CIRCLES AI
</strong>

</div>



<div className="copy-row">

<span>
FOLLOWERS
</span>

<strong>
0
</strong>

</div>



<div className="copy-row">

<span>
STATUS
</span>

<strong className="offline">
READY
</strong>

</div>



<button className="copy-button">
START COPYING
</button>


</div>


);


};


export default CopyTrading;