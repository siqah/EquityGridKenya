import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Map, { useControl } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer } from '@deck.gl/layers';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSyntheticData } from '../../context/SyntheticDataContext';
import { povertyIndexForCounty } from '../../data/countyPovertyIndex';

const GEOJSON_URL =
  'https://raw.githubusercontent.com/mikelmaron/kenya-election-data/master/data/constituencies.geojson';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

const INITIAL_VIEW = {
  longitude: 37.9062,
  latitude: 0.0236,
  zoom: 5.5,
  pitch: 30,
  bearing: 0,
};

const COL = {
  green: [22, 163, 74],
  red: [220, 38, 38],
  amber: [217, 119, 6],
  gray: [156, 163, 175],
};

const HEX_COLOR_RANGE = [
  [21, 128, 61],
  [34, 197, 94],
  [253, 224, 71],
  [251, 146, 60],
  [239, 68, 68],
  [153, 27, 27],
];

function titleCounty(raw) {
  if (!raw) return '';
  return String(raw)
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Map GeoJSON COUNTY_NAM to synthetic `county_base` keys. */
function modelCountyName(geoCountyRaw) {
  let t = titleCounty(geoCountyRaw);
  const fixes = {
    Muranga: "Murang'a",
    Tharaka: 'Tharaka Nithi',
    'Elgeyo/marakwet': 'Elgeyo Marakwet',
    'Elgeyo Marakwet': 'Elgeyo Marakwet',
    'Taita/taveta': 'Taita Taveta',
    'Homa Bay': 'Homa Bay',
    'West Pokot': 'West Pokot',
  };
  const k = t.replace(/\s*\/\s*/gi, ' ');
  return fixes[k] || fixes[t] || k;
}

function dominantClass(total, g, y, r) {
  if (!total) return 'none';
  if (g / total > 0.5) return 'GREEN';
  if (r / total > 0.5) return 'RED';
  return 'MIXED';
}

function fillForDominant(dom) {
  if (dom === 'GREEN') return COL.green;
  if (dom === 'RED') return COL.red;
  if (dom === 'MIXED') return COL.amber;
  return COL.gray;
}

function dominantFlagType(accounts) {
  const m = new Map();
  accounts.forEach((a) => {
    (a.flags || []).forEach((f) => {
      m.set(f, (m.get(f) || 0) + 1);
    });
  });
  let best = null;
  let n = 0;
  m.forEach((v, k) => {
    if (v > n) {
      n = v;
      best = k;
    }
  });
  return best;
}

function DeckGLOverlay({ layers, interleaved, onHover, onClick }) {
  const overlay = useControl(() => new MapboxOverlay({ interleaved, layers: [] }), { position: 'top-left' });
  useEffect(() => {
    overlay.setProps({ layers, onHover, onClick, pickingRadius: 8 });
  }, [overlay, layers, onHover, onClick]);
  return null;
}

export default function KenyaDeckMap() {
  const { accounts, stats } = useSyntheticData();
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const [geojson, setGeojson] = useState(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW);
  const [mode, setMode] = useState('county');
  const [opacity, setOpacity] = useState(0.85);
  const [hover, setHover] = useState(null);
  const [selectedCounty, setSelectedCounty] = useState(null);

  const countyStatsMap = useMemo(() => {
    const m = new Map();
    (stats.countyAgg || []).forEach((row) => {
      m.set(row.name, row);
    });
    return m;
  }, [stats.countyAgg]);

  const accountsByCounty = useMemo(() => {
    const m = new Map();
    accounts.forEach((a) => {
      const key = a.county_base || a.county.split('(')[0].trim();
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(a);
    });
    return m;
  }, [accounts]);

  const maxCountyAccounts = useMemo(() => {
    let mx = 1;
    (stats.countyAgg || []).forEach((c) => {
      mx = Math.max(mx, c.total);
    });
    return mx;
  }, [stats.countyAgg]);

  const hexData = useMemo(
    () =>
      accounts
        .filter((a) => Array.isArray(a.coordinates) && a.coordinates.length === 2)
        .map((a) => ({
          position: [a.coordinates[0], a.coordinates[1]],
          final_score: a.final_score,
        })),
    [accounts],
  );

  useEffect(() => {
    let cancelled = false;
    fetch(GEOJSON_URL)
      .then((r) => r.json())
      .then((gj) => {
        if (cancelled || !gj?.features) return;
        const enriched = {
          ...gj,
          features: gj.features.map((f) => {
            const cname = modelCountyName(f.properties?.COUNTY_NAM);
            const row = countyStatsMap.get(cname);
            const localAccounts = accountsByCounty.get(cname) || [];
            const total = row?.total ?? 0;
            const g = row?.GREEN ?? 0;
            const y = row?.YELLOW ?? 0;
            const r = row?.RED ?? 0;
            const dom = dominantClass(total, g, y, r);
            const elev = total > 0 ? (total / maxCountyAccounts) * 80000 : 0;
            return {
              ...f,
              properties: {
                ...f.properties,
                _modelCounty: cname,
                _total: total,
                _GREEN: g,
                _YELLOW: y,
                _RED: r,
                _dominant: dom,
                _avgScore: row?.avg_equity_score ?? null,
                _nspsPct: row?.nsps_share_pct ?? null,
                _elevation: elev,
                _dominantFlag: dominantFlagType(localAccounts),
              },
            };
          }),
        };
        setGeojson(enriched);
      })
      .catch(() => setGeojson(null));
    return () => {
      cancelled = true;
    };
  }, [countyStatsMap, accountsByCounty, maxCountyAccounts]);

  const onHoverDeck = useCallback(
    (info) => {
      if (mode !== 'county') {
        setHover(null);
        return true;
      }
      const f = info?.object;
      if (f?.properties?._modelCounty) {
        const c = f.properties._modelCounty;
        const row = countyStatsMap.get(c) || {
          name: c,
          total: f.properties._total,
          GREEN: f.properties._GREEN,
          YELLOW: f.properties._YELLOW,
          RED: f.properties._RED,
          avg_equity_score: f.properties._avgScore ?? '—',
        };
        setHover({
          x: info.x,
          y: info.y,
          county: c,
          row,
          flag: f.properties._dominantFlag,
          poverty: povertyIndexForCounty(c),
        });
      } else {
        setHover(null);
      }
      return true;
    },
    [mode, countyStatsMap],
  );

  const onClickDeck = useCallback(
    (info) => {
      if (mode !== 'county') return true;
      const f = info?.object;
      const c = f?.properties?._modelCounty;
      if (c) setSelectedCounty(c);
      return true;
    },
    [mode],
  );

  const layers = useMemo(() => {
    if (!geojson?.features?.length) return [];

    if (mode === 'heatmap') {
      return [
        new HexagonLayer({
          id: 'hex-equity',
          data: hexData,
          gpuAggregation: true,
          radius: 15000,
          extruded: true,
          elevationScale: 80,
          elevationAggregation: 'SUM',
          getPosition: (d) => d.position,
          getColorValue: (pts) =>
            pts.length ? pts.reduce((s, p) => s + p.final_score, 0) / pts.length : 0,
          colorDomain: [0, 100],
          colorRange: HEX_COLOR_RANGE,
          opacity,
          pickable: true,
          material: {
            ambient: 0.64,
            diffuse: 0.6,
            shininess: 32,
            specularColor: [255, 255, 255],
          },
        }),
      ];
    }

    return [
      new GeoJsonLayer({
        id: 'counties-extruded',
        data: geojson,
        opacity,
        pickable: true,
        stroked: true,
        filled: true,
        extruded: true,
        wireframe: false,
        elevationScale: 100,
        getElevation: (d) => d.properties._elevation || 0,
        getFillColor: (d) => {
          const rgb = fillForDominant(d.properties._dominant);
          const a = d.properties._dominant === 'none' ? 140 : 220;
          return [rgb[0], rgb[1], rgb[2], a];
        },
        getLineColor: [55, 65, 81, 200],
        lineWidthMinPixels: 1,
        getLineWidth: 1,
        updateTriggers: {
          getFillColor: [opacity, geojson, maxCountyAccounts],
          getElevation: [maxCountyAccounts, geojson],
        },
      }),
    ];
  }, [geojson, mode, hexData, opacity, maxCountyAccounts]);

  const resetView = () => {
    setViewState({ ...INITIAL_VIEW });
    mapRef.current?.flyTo?.({
      center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
      zoom: INITIAL_VIEW.zoom,
      pitch: INITIAL_VIEW.pitch,
      bearing: INITIAL_VIEW.bearing,
      duration: 800,
    });
  };

  const panelAccounts = selectedCounty ? accountsByCounty.get(selectedCounty) || [] : [];

  return (
    <div className="card overflow-hidden flex flex-col min-h-[520px] h-[62vh] relative">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-primary">Kenya — 3D map</span>
          <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
            <button
              type="button"
              className={`px-3 py-1.5 ${mode === 'county' ? 'bg-primary text-white' : 'bg-surface text-body'}`}
              onClick={() => {
                setMode('county');
                setHover(null);
              }}
            >
              County View
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 ${mode === 'heatmap' ? 'bg-primary text-white' : 'bg-surface text-body'}`}
              onClick={() => {
                setMode('heatmap');
                setHover(null);
                setSelectedCounty(null);
              }}
            >
              Heatmap View
            </button>
          </div>
        </div>
        <p className="text-[11px] text-muted max-w-md">
          Constituency boundaries grouped by county · colors from dominant classification in synthetic cohort
        </p>
      </div>

      <div className="relative flex-1 min-h-[460px]">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle={MAP_STYLE}
          mapLib={maplibregl}
          dragPan
          scrollZoom
          dragRotate
          touchPitch
          touchZoomRotate
          pitchWithRotate
          maxPitch={70}
          minZoom={4}
          maxZoom={14}
          attributionControl={false}
        >
          <DeckGLOverlay
            interleaved
            layers={layers}
            onHover={onHoverDeck}
            onClick={onClickDeck}
          />
        </Map>

        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 w-[200px] rounded-xl border border-border bg-surface/95 backdrop-blur p-3 shadow-card text-xs">
          <div className="font-bold text-primary">Layers</div>
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="maplayer"
                checked={mode === 'county'}
                onChange={() => setMode('county')}
              />
              County choropleth
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="maplayer"
                checked={mode === 'heatmap'}
                onChange={() => setMode('heatmap')}
              />
              Density heatmap
            </label>
          </div>
          <label className="flex flex-col gap-1 mt-1">
            <span className="text-muted">Opacity</span>
            <input
              type="range"
              min={0.25}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            className="mt-1 py-1.5 rounded-lg border border-border text-body font-semibold hover:bg-surface-muted"
            onClick={resetView}
          >
            Reset view
          </button>
          <div className="mt-2 pt-2 border-t border-border space-y-1">
            <div className="font-semibold text-body">Legend</div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ background: '#16A34A' }} />
              <span className="text-muted">&gt;50% GREEN</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ background: '#D97706' }} />
              <span className="text-muted">Mixed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ background: '#DC2626' }} />
              <span className="text-muted">&gt;50% RED</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ background: '#9CA3AF' }} />
              <span className="text-muted">No cohort data</span>
            </div>
            {mode === 'heatmap' && (
              <p className="text-[10px] text-muted leading-snug mt-1">
                Hex colour ≈ mean equity score (low = greener, high = redder).
              </p>
            )}
          </div>
        </div>

        <div className="absolute bottom-1 left-2 z-10 text-[10px] text-muted bg-surface/80 px-2 py-0.5 rounded pointer-events-none">
          Basemap © CARTO · Boundaries: OpenStreetMap / Kenya election data
        </div>

        {hover && (
          <div
            className="absolute z-20 pointer-events-none rounded-xl border border-border bg-white shadow-xl p-3 text-xs w-[240px]"
            style={{
              left: Math.min(Math.max(hover.x + 12, 8), 'calc(100% - 248px)'),
              top: Math.min(Math.max(hover.y + 12, 8), 120),
            }}
          >
            <div className="font-bold text-body text-sm mb-2">{hover.county}</div>
            <div className="text-muted mb-1">
              Total accounts: <span className="font-semibold text-body">{hover.row.total}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-tier-green border border-emerald-200 font-bold">
                G {hover.row.GREEN}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-tier-yellow border border-amber-200 font-bold">
                Y {hover.row.YELLOW}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-tier-red border border-red-200 font-bold">
                R {hover.row.RED}
              </span>
            </div>
            <div className="text-muted mb-1">
              KNBS poverty index:{' '}
              <span className="font-semibold text-body">{hover.poverty?.toFixed?.(1) ?? hover.poverty}%</span>
            </div>
            <div className="text-muted mb-1">
              Dominant flag:{' '}
              <span className="font-semibold text-body">{hover.flag || '—'}</span>
            </div>
            <div className="text-muted">
              Avg equity score:{' '}
              <span className="font-mono font-bold text-body">{hover.row.avg_equity_score}</span>
            </div>
          </div>
        )}
      </div>

      {selectedCounty && (
        <div className="absolute inset-0 z-30 flex justify-end animate-fade-in">
          <button
            type="button"
            className="flex-1 min-w-0 bg-black/20 cursor-default"
            aria-label="Close county panel"
            onClick={() => setSelectedCounty(null)}
          />
          <div className="w-full max-w-md bg-surface border-l border-border shadow-2xl flex flex-col h-full">
          <div className="p-4 border-b border-border flex items-center justify-between gap-2">
            <div>
              <div className="text-xs text-muted uppercase">County</div>
              <div className="text-lg font-bold text-primary">{selectedCounty}</div>
              <div className="text-xs text-muted mt-1">{panelAccounts.length} accounts</div>
            </div>
            <button
              type="button"
              className="shrink-0 px-3 py-1.5 rounded-lg border border-border text-sm font-semibold"
              onClick={() => setSelectedCounty(null)}
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-auto p-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="py-2 pr-2">Account</th>
                  <th className="py-2 pr-2">Score</th>
                  <th className="py-2 pr-2">Class</th>
                  <th className="py-2">Flags</th>
                </tr>
              </thead>
              <tbody>
                {panelAccounts.map((a) => (
                  <tr key={a.account_hash} className="border-b border-border/60 hover:bg-surface-muted/80">
                    <td className="py-2 pr-2 font-mono font-semibold">
                      <button
                        type="button"
                        className="text-primary underline text-left"
                        onClick={() => navigate(`/lookup?account=${encodeURIComponent(a.account_hash)}`)}
                      >
                        {a.account_hash}
                      </button>
                    </td>
                    <td className="py-2 pr-2 font-mono">{a.final_score}</td>
                    <td className="py-2 pr-2">
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                          a.classification === 'GREEN'
                            ? 'bg-emerald-50 text-tier-green border-emerald-200'
                            : a.classification === 'YELLOW'
                              ? 'bg-amber-50 text-tier-yellow border-amber-200'
                              : 'bg-red-50 text-tier-red border-red-200'
                        }`}
                      >
                        {a.classification}
                      </span>
                    </td>
                    <td className="py-2 text-muted truncate max-w-[100px]" title={(a.flags || []).join(', ')}>
                      {(a.flags || []).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {panelAccounts.length === 0 && (
              <p className="text-sm text-muted p-4">No synthetic accounts mapped to this county.</p>
            )}
          </div>
          <div className="p-3 border-t border-border text-[11px] text-muted">
            Tip: open full{' '}
            <Link to="/lookup" className="text-primary font-semibold">
              Account Lookup
            </Link>{' '}
            for signal cards and prompts.
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
