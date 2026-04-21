import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

/**
 * D3.js Histogram — Equity Score Distribution
 * Shows the spread of scores across all accounts with
 * color-coded bins matching the classification thresholds.
 */
export default function ScoreDistribution({ results }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!results || results.length === 0 || !svgRef.current) return;

    const scores = results.map(r => r.equity_score);

    // Dimensions
    const margin = { top: 20, right: 20, bottom: 40, left: 44 };
    const width = 500 - margin.left - margin.right;
    const height = 220 - margin.top - margin.bottom;

    // Clear
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Scales
    const x = d3.scaleLinear().domain([0, 100]).range([0, width]);

    // Histogram bins
    const histogram = d3.bin().domain(x.domain()).thresholds(20);
    const bins = histogram(scores);

    const y = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length) * 1.15])
      .range([height, 0]);

    // Color by score range
    const getBarColor = (x0) => {
      if (x0 >= 70) return '#2ECC71';
      if (x0 >= 40) return '#F1C40F';
      return '#E74C3C';
    };

    // Grid lines
    svg.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(y.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => y(d))
      .attr('y2', d => y(d))
      .attr('stroke', 'rgba(255, 255, 255, 0.04)')
      .attr('stroke-dasharray', '3,3');

    // Threshold lines
    [40, 70].forEach(threshold => {
      svg.append('line')
        .attr('x1', x(threshold))
        .attr('x2', x(threshold))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', 'rgba(255, 255, 255, 0.15)')
        .attr('stroke-dasharray', '6,4')
        .attr('stroke-width', 1.5);

      svg.append('text')
        .attr('x', x(threshold))
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(255, 255, 255, 0.3)')
        .attr('font-size', '9px')
        .attr('font-weight', '600')
        .attr('font-family', "'Inter', sans-serif")
        .text(threshold === 40 ? 'RED | YLW' : 'YLW | GRN');
    });

    // Bars with animation
    svg.selectAll('.bar')
      .data(bins)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.x0) + 1)
      .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 2))
      .attr('y', height)
      .attr('height', 0)
      .attr('fill', d => getBarColor(d.x0))
      .attr('opacity', 0.75)
      .attr('rx', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function () {
        d3.select(this).attr('opacity', 1);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 0.75);
      })
      .transition()
      .duration(600)
      .delay((d, i) => i * 30)
      .ease(d3.easeCubicOut)
      .attr('y', d => y(d.length))
      .attr('height', d => height - y(d.length));

    // X axis
    svg.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(
        d3.axisBottom(x)
          .tickValues([0, 20, 40, 60, 70, 80, 100])
          .tickSize(0)
          .tickPadding(10)
      )
      .call(g => g.select('.domain').attr('stroke', 'rgba(255,255,255,0.1)'))
      .selectAll('text')
      .attr('fill', '#64748B')
      .attr('font-size', '10px')
      .attr('font-family', "'Inter', sans-serif");

    // Y axis
    svg.append('g')
      .call(
        d3.axisLeft(y)
          .ticks(5)
          .tickSize(0)
          .tickPadding(8)
      )
      .call(g => g.select('.domain').remove())
      .selectAll('text')
      .attr('fill', '#64748B')
      .attr('font-size', '10px')
      .attr('font-family', "'Inter', sans-serif");

    // Y label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -34)
      .attr('text-anchor', 'middle')
      .attr('fill', '#475569')
      .attr('font-size', '10px')
      .attr('font-family', "'Inter', sans-serif")
      .text('Accounts');

  }, [results]);

  return (
    <div className="glass-card">
      <div className="glass-card-header">
        <span className="glass-card-title">Equity Score Distribution</span>
        <span style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
          {results ? results.length : 0} accounts
        </span>
      </div>
      <div className="glass-card-body" style={{ overflowX: 'auto' }}>
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
}
