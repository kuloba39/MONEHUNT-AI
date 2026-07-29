import './profit-chart.scss';
interface Props {
    data: number[];
}

const ProfitChart = ({ data }: Props) => {

    const maxValue = Math.max(...data);

    return (

        <div className="profit-chart">

            <h2>Profit Growth</h2>

            <div className="profit-chart__bars">

                {data.map((value, index) => (

                    <div
                        key={index}
                        className="profit-chart__item"
                    >

                        <div
                            className="profit-chart__bar"
                            style={{
                                height: `${(value / maxValue) * 180}px`,
                            }}
                        />

                        <span>
                            {index + 1}
                        </span>

                    </div>

                ))}

            </div>

        </div>

    );

};

export default ProfitChart;