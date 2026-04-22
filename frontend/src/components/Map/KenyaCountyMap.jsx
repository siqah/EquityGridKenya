import { useEffect, useMemo, useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';
import { feature } from 'topojson-client';
import { centroidForCounty } from '../../data/countyCentroids';

const WORLD_TOPO = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';

function getKenyaFeature(topology) {
  const geo = feature(topology, topology.objects.countries);
  return (
    geo.features.find((g) => g.properties?.ISO_A3 === 'KEN' || g.properties?.ADM0_A3 === 'KEN')
    || geo.features.find((g) => (g.properties?.NAME || '').toLowerCase() === 'kenya')
    || geo.features.find((g) => String(g.id) === '404')
    || null
  );
}

function fillForCounty(row) {
  if (!row || row.total < 1) return '#E5E7EB';
  const g = row.GREEN / row.total;
  const r = row.RED / row.total;
  if (g >= 0.45) return 'rgba(22, 163, 74, 0.55)';
  if (r >= 0.35) return 'rgba(220, 38, 38, 0.5)';
  return '#D1D5DB';
}

export default function KenyaCountyMap({ countyAgg }) {
  const [topology, setTopology] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(WORLD_TOPO)
      .then((r) => r.json())
      .then((topo) => {
        if (!cancelled) setTopology(topo);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load map outline.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const kenya = useMemo(() => (topology ? getKenyaFeature(topology) : null), [topology]);

  const aggMap = useMemo(() => {
    const m = new Map();
    (countyAgg || []).forEach((c) => m.set(c.name, c));
    return m;
  }, [countyAgg]);

  return (
    <div className="card overflow-hidden flex flex-col min-h-[420px]">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">Kenya — County concentration</span>
        <span className="text-xs text-muted">Markers sized by accounts · hover for detail</span>
      </div>
      <div className="p-4 flex-1 relative bg-surface-muted">
        {error && (
          <p className="text-sm text-muted px-2 py-6 text-center">{error}</p>
        )}
        {!error && (
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ center: [37.5, 0.4], scale: 2200 }}
            width={800}
            height={420}
            className="w-full h-auto max-h-[420px]"
          >
            <ZoomableGroup center={[37.5, 0.4]} zoom={1}>
              {kenya && (
                <Geographies geography={{ type: 'FeatureCollection', features: [kenya] }}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="#F3F4F6"
                        stroke="#E5E7EB"
                        strokeWidth={0.6}
                        style={{ default: { outline: 'none' }, hover: { outline: 'none' } }}
                      />
                    ))
                  }
                </Geographies>
              )}
              {(countyAgg || []).map((row) => {
                const [lon, lat] = centroidForCounty(row.name);
                const r = Math.max(4, Math.min(22, 4 + Math.sqrt(row.total) * 1.6));
                const fill = fillForCounty(row);
                const title = `${row.name}\nAccounts: ${row.total}\nDominant: ${row.dominant}\nPoverty index: ${row.poverty_index}`;
                return (
                  <Marker key={row.name} coordinates={[lon, lat]}>
                    <g>
                      <title>{title}</title>
                      <circle r={r} fill={fill} stroke="#FFFFFF" strokeWidth={1.2} className="drop-shadow-sm" />
                      <text
                        textAnchor="middle"
                        y={4}
                        style={{ fontSize: 8, fill: '#111827', fontWeight: 700, pointerEvents: 'none' }}
                      >
                        {row.total > 40 ? row.name.slice(0, 3) : ''}
                      </text>
                    </g>
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>
        )}
        <div className="flex flex-wrap gap-4 px-2 pb-3 pt-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-tier-green/60" /> High GREEN share
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-tier-red/60" /> High RED share
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-gray-300" /> Mixed / standard
          </span>
        </div>
      </div>
    </div>
  );
}
