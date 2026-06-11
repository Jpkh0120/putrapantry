import { useState, useEffect, useRef } from 'react';

export default function RegressionSimulator({ liveForecasts }) {
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);
  const canvasRef = useRef(null);
  
  const hasData = liveForecasts && liveForecasts.length > 0;
  const currentItem = hasData ? liveForecasts[selectedItemIdx] : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 600, 400);

    // 1. Draw Background Grid Layout Baseline
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 50; i < 600; i += 50) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 400); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(600, i); ctx.stroke();
    }

    if (!currentItem || !currentItem.forecastedDemand) return;

    const demandData = currentItem.forecastedDemand; // Array of 7 values (Mon - Sun)
    
    // 2. Find the maximum demand quantity dynamically to compute a fluid scale factor
    const maxQty = Math.max(...demandData, 1); 
    
    // 3. Map values to Canvas space using dynamic fractional compression mapping
    // Leaves 60px padding at the top and bottom bounds so labels/dots never clip
    const points = demandData.map((qty, index) => {
      const x = 50 + (index * 75);
      const y = 340 - ((qty / maxQty) * 260); 
      return { x, y, qty, dayIdx: index };
    });

    // 4. Mathematical Calculation Engine: Ordinary Least Squares (OLS)
    const N = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    points.forEach(p => {
      const mathX = p.dayIdx;
      const mathY = p.qty;
      sumX += mathX;
      sumY += mathY;
      sumXY += (mathX * mathY);
      sumXX += (mathX * mathX);
    });

    const den = (N * sumXX) - (sumX * sumX);
    const m = den !== 0 ? ((N * sumXY) - (sumX * sumY)) / den : 0;
    const b = (sumY - (m * sumX)) / N;

    // 5. Draw Fluid Trend Regression Line Path
    const startX = 0;
    const startY = 340 - ((b / maxQty) * 260);
    const endX = 600;
    const endY = 340 - ((((m * 6) + b) / maxQty) * 260);

    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // 6. Draw Coordinate Indicator Dots (Mon - Sun values)
    points.forEach((p) => {
      ctx.fillStyle = '#d32f2f';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${days[p.dayIdx]} (${p.qty})`, p.x - 22, p.y - 14);
    });

  }, [currentItem, selectedItemIdx]);

  if (!hasData) {
    return (
      <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontWeight: '500' }}>
        Waiting for live forecast data synchronization array...
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginTop: '35px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#1b5e20', fontSize: '1.25rem', fontWeight: '700' }}>📈 Live Model Regression Inspector</h3>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>Visualizing the trend lines calculated directly from your UPM student pickup history logs.</p>
        </div>
        
        <div>
          <label style={{ marginRight: '8px', fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Inspect Item:</label>
          <select 
            value={selectedItemIdx} 
            onChange={(e) => setSelectedItemIdx(Number(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: '500', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
          >
            {liveForecasts.map((item, idx) => (
              <option key={item.itemId} value={idx}>{item.label || item.itemId}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '24px' }}>
        {/* Graph Canvas Window Layout Box */}
        <div style={{ position: 'relative', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc' }}>
          <canvas ref={canvasRef} width={600} height={400} style={{ display: 'block', width: '100%' }} />
          <span style={{ position: 'absolute', bottom: '10px', right: '15px', background: '#1e293b', color: '#fff', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', fontWeight: '500' }}>Timeline Vector (Next 7 Days)</span>
        </div>

        {/* Informative Inspection Metric Side Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'center' }}>
          <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Target Item</span>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#14532d', marginTop: '4px' }}>
              {currentItem?.label}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>7-Day Total Demand</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', marginTop: '2px' }}>{currentItem?.totalForecast7Days} units</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Smart Restock Recommendation</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1b5e20', marginTop: '2px' }}>{currentItem?.suggestedRestockQty} units</div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Includes 20% safety stock buffer threshold.</p>
          </div>
        </div>
      </div>
    </div>
  );
}