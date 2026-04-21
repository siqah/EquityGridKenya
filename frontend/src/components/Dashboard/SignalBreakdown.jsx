import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

/**
 * D3.js Horizontal Bar Chart — Signal Breakdown by County
 * Shows average geographic, token, and consumption scores per county.
 */
export default function SignalBreakdown({ results }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!results || results.length === 0 || !svgRef.current) return;

    // Aggregate by county
    const countyMap = new Map();
    results.forEach(r => {
      if (!countyMap.has(r.county)) {
        countyMap.set(r.county, { count: 0, geo: 0, token: 0, consumption: 0 });
      }
      const c = countyMap.get(r.county);
      c.count += 1;
      c.geo += r.geographic_score;
      c.token += r.token_score;
      c.consumption += r.consumption_score;
    });

    const countyData = Array.from(countyMap.entries())
      .map(([county, d]) => ({
        county,
        geographic: Math.round(d.geo / d.count),
        token: Math.round(d.token / d.count),
        consumption: Math.round(d.consumption / d.count),
        count: d.count,
      }))
      .sort((a, b) => b.geographic - a.geographic)
      .slice(0, 10); // top 10 counties

    // Dimensions
    const margin = { top: 8, right: 20, bottom: 30, left: 100 };
    const barHeight = 22;
    const groupGap = 8;
    const height = countyData.length * (barHeight * 3 + groupGap) + margin.top + margin.bottom;
    const width = 500 - margin.left - margin.right;

    // Clear
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleLinear().domain([0, 100]).range([0, width]);

    const signals = [
      { key: 'geographic', color: '#00D4FF', label: 'Geo' },
      { key: 'token', color: '#2ECC71', label: 'Token' },
      { key: 'consumption', color: '#F1C40F', label: 'Cons' },
    ];

    countyData.forEach((county, i) => {
      const yOffset = i * (barHeight * 3 + groupGap);

      // County label
      svg.append('text')
        .attr('x', -8)
        .attr('y', yOffset + barHeight * 1.5 + 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#CBD5E1')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .attr('font-family', "'Inter', sans-serif")
        .text(county.county);

      signals.forEach((signal, j) => {
        const yPos = yOffset + j * barHeight;

        // Background bar
        svg.append('rect')
          .attr('x', 0)
          .attr('y', yPos + 2)
          .attr('width', width)
          .attr('height', barHeight - 4)
          .attr('fill', 'rgba(255,255,255,0.03)')
          .attr('rx', 3);

        // Value bar with animation
        svg.append('rect')
          .attr('x', 0)
          .attr('y', yPos + 2)
          .attr('width', 0)
          .attr('height', barHeight - 4)
          .attr('fill', signal.color)
          .attr('opacity', 0.7)
          .attr('rx', 3)
          .transition()
          .duration(600)
          .delay(i * 60 + j * 100)
          .ease(d3.easeCubicOut)
          .attr('width', x(county[signal.key]));

        // Value text
        svg.append('text')
          .attr('x', Math.max(x(county[signal.key]) + 6, 30))
          .attr('y', yPos + barHeight / 2 + 3)
          .attr('fill', '#94A3B8')
          .attr('font-size', '9px')
          .attr('font-weight', '600')
          .attr('font-family', "'Inter', sans-serif")
          .attr('opacity', 0)
          .transition()
          .duration(400)
          .delay(i * 60 + j * 100 + 300)
          .attr('opacity', 1)
          .text(`${signal.label}: ${county[signal.key]}`);
      });
    });

  }, [results]);

  return (
    <div className="glass-card">
      <div className="glass-card-header">
        <span className="glass-card-title">Signal Breakdown by County</span>
        <span style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
          Top 10 counties
        </span>
      </div>
      <div className="glass-card-body" style={{ overflowX: 'auto' }}>
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
}
