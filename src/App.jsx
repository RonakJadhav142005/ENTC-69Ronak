
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { HeatMapGrid } from 'react-grid-heatmap';
import { CircularProgress } from '@mui/material';

const API_BASE = 'http://localhost:3000';

export default function StockDashboard() {
  const [stocks, setStocks] = useState([]);
  const [timeFrame, setTimeFrame] = useState(60);
  const [stockData, setStockData] = useState({});
  const [correlationMatrix, setCorrelationMatrix] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/stocks`)
      .then(res => res.json())
      .then(data => {
        setStocks(data);
        return Promise.all(data.map(stock => fetch(`${API_BASE}/history/${stock}?minutes=${timeFrame}`).then(res => res.json())));
      })
      .then(dataArr => {
        const stockDataMap = {};
        dataArr.forEach((data, index) => {
          stockDataMap[stocks[index]] = data;
        });
        setStockData(stockDataMap);
        setLoading(false);
        computeCorrelation(stockDataMap);
      });
  }, [timeFrame]);

  const computeCorrelation = (dataMap) => {
    const tickers = Object.keys(dataMap);
    const matrix = tickers.map(t1 => tickers.map(t2 => calculatePearson(dataMap[t1], dataMap[t2])));
    setCorrelationMatrix(matrix);
  };

  const calculatePearson = (xData, yData) => {
    const n = xData.length;
    if (n === 0) return 0;
    const meanX = xData.reduce((sum, d) => sum + d.price, 0) / n;
    const meanY = yData.reduce((sum, d) => sum + d.price, 0) / n;

    const numerator = xData.reduce((sum, d, i) => sum + (d.price - meanX) * (yData[i].price - meanY), 0);
    const denominatorX = Math.sqrt(xData.reduce((sum, d) => sum + Math.pow(d.price - meanX, 2), 0));
    const denominatorY = Math.sqrt(yData.reduce((sum, d) => sum + Math.pow(d.price - meanY, 2), 0));

    return numerator / (denominatorX * denominatorY);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <Card>
        <CardContent>
          <h2 className="text-xl font-semibold mb-4">Stock Price Chart</h2>
          <Slider min={5} max={120} step={5} value={timeFrame} onValueChange={val => setTimeFrame(val)} />
          {stocks.map(ticker => (
            <div key={ticker} className="my-4">
              <h3 className="font-medium text-lg mb-2">{ticker}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stockData[ticker] || []}>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="price" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-xl font-semibold mb-4">Correlation Heatmap</h2>
          {loading ? (
            <CircularProgress />
          ) : (
            <HeatMapGrid
              data={correlationMatrix}
              xLabels={stocks}
              yLabels={stocks}
              cellRender={(x, y, value) => value?.toFixed(2)}
              cellStyle={(_x, _y, value) => ({
                background: `rgba(100, 0, 200, ${Math.abs(value)})`,
                color: '#fff',
              })}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
