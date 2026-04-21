import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

/**
 * D3.js Donut Chart — Classification Distribution
 * Renders GREEN/YELLOW/RED counts as an interactive donut.
 */
export default function ClassificationChart({ stats }) {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  const colors = {
    GREEN: '#2ECC71',
    YELLOW: '#F1C40F',
    RED: '#E74C3C',
  };

  const labels = {
    GREEN: 'Subsidize (Green)',
    YELLOW: 'Standard (Yellow)',
    RED: 'Luxury / Anomaly (Red)',
  };

  useEffect(() => {
    if (!stats || !svgRef.current) return;

    const counts = stats.classification_counts || {};
    const data = [
      { key: 'GREEN', value: counts.GREEN || 0 },
      { key: 'YELLOW', value: counts.YELLOW || 0 },
      { key: 'RED', value: counts.RED || 0 },
    ].filter(d => d.value > 0);

    const total = d3.sum(data, d => d.value);
    if (total === 0) return;

    // Dimensions
    const width = 220;
    const height = 220;
    const radius = Math.min(width, height) / 2;
    const innerRadius = radius * 0.62;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Arc generator
    const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius).cornerRadius(4).padAngle(0.03);

    const hoverArc = d3.arc().innerRadius(innerRadius - 2).outerRadius(radius + 6).cornerRadius(4).padAngle(0.03);

    // Pie generator
    const pie = d3.pie().value(d => d.value).sort(null);

    // Draw arcs with animation
    const arcs = svg
      .selectAll('.arc')
      .data(pie(data))
      .join('g')
      .attr('class', 'arc')
      .style('cursor', 'pointer');

    arcs
      .append('path')
      .attr('fill', d => colors[d.data.key])
      .attr('opacity', 0.9)
      .each(function (d) {
        this._current = { startAngle: 0, endAngle: 0 };
      })
      .transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .attrTween('d', function (d) {
        const interpolate = d3.interpolate(this._current, d);
        this._current = interpolate(1);
        return t => arc(interpolate(t));
      });

    // Hover effects
    arcs
      .selectAll('path')
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', hoverArc(d))
          .attr('opacity', 1);
      })
      .on('mouseleave', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc(d))
          .attr('opacity', 0.9);
      });

    // Center text
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-6px')
      .attr('fill', '#F1F5F9')
      .attr('font-size', '28px')
      .attr('font-weight', '800')
      .attr('font-family', "'Inter', sans-serif")
      .text(total);

    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '16px')
      .attr('fill', '#94A3B8')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('font-family', "'Inter', sans-serif")
      .attr('letter-spacing', '1.5px')
      .text('ACCOUNTS');

  }, [stats]);

  if (!stats) return null;

  const counts = stats.classification_counts || {};

  return (
    <div className="glass-card">
      <div className="glass-card-header">
        <span className="glass-card-title">Classification Distribution</span>
      </div>
      <div className="glass-card-body" style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
        <svg ref={svgRef}></svg>
        <div className="donut-legend">
          {[
            { key: 'GREEN', cls: 'green', label: 'Subsidize (Green)' },
            { key: 'YELLOW', cls: 'yellow', label: 'Standard (Yellow)' },
            { key: 'RED', cls: 'red', label: 'Luxury / Anomaly (Red)' },
          ].map(item => (
            <div key={item.key} className="donut-legend-item">
              <span className={`donut-legend-dot ${item.cls}`}></span>
              <span className="donut-legend-label">{item.label}</span>
              <span className="donut-legend-value">{counts[item.key] || 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
