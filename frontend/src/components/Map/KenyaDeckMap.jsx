import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MapLibreMap, { useControl } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer } from '@deck.gl/layers';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSyntheticData } from '../../context/SyntheticDataContext';
import { povertyIndexForCounty } from '../../data/countyPovertyIndex';

const GEOJSON_URL =
  'https://raw.githubusercontent.com/mikelmaron/kenya-election-data/master/data/constituencies.geojson';

/** Dark basemap — tier colours read clearly on top; no reliance on light roads. */
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

/** MapLibre / deck.gl use [lng, lat]. Tight box around Kenya (with small margin). */
const KENYA_BOUNDS = {
  west: 33.75,
  east: 42.05,
  south: -4.85,
  north: 5.05,
};

function inKenyaBounds(lng, lat) {
  return lng >= KENYA_BOUNDS.west && lng <= KENYA_BOUNDS.east && lat >= KENYA_BOUNDS.south && lat <= KENYA_BOUNDS.north;
}

const INITIAL_VIEW = {
  longitude: 37.9062,
  latitude: 0.0236,
  zoom: 5.8,
  pitch: 32,
  bearing: 0,
};

/** Matte PBR — extrusion reads as solid colour blocks, no specular streaks / “rays”. */
const MATTE_3D = {
  ambient: 1,
  diffuse: 0.42,
  shininess: 0,
  specularColor: [0, 0, 0],
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

export default function KenyaDeckMap({ className = '' }) {
  const { accounts, stats } = useSyntheticData();
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const [geojson, setGeojson] = useState(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW);
  const [mode, setMode] = useState('county');
  const [opacity, setOpacity] = useState(0.85);
  const [hover, setHover] = useState(null);
  const [hexHover, setHexHover] = useState(null);
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [countyFilter, setCountyFilter] = useState('');

  useEffect(() => {
    setCountyFilter('');
  }, [selectedCounty]);

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
        .filter((a) => inKenyaBounds(a.coordinates[0], a.coordinates[1]))
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
            /* Meters-ish extrusion height — keep moderate so pitch/depth buffer stays stable with MapLibre + deck. */
            const elev = total > 0 ? 400 + (total / maxCountyAccounts) * 3200 : 0;
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
      if (mode === 'heatmap') {
        const o = info?.object;
        if (o?.position) {
          const pts = o.points;
          const cnt = Array.isArray(pts) ? pts.length : o.count ?? 0;
          const avg = typeof o.colorValue === 'number' ? o.colorValue : 0;
          setHexHover({
            x: info.x,
            y: info.y,
            lng: o.position[0],
            lat: o.position[1],
            count: cnt,
            avg,
          });
        } else {
          setHexHover(null);
        }
        setHover(null);
        return true;
      }

      setHexHover(null);
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
        new GeoJsonLayer({
          id: 'kenya-county-outlines',
          data: geojson,
          stroked: true,
          filled: false,
          pickable: false,
          lineWidthMinPixels: 1,
          getLineColor: [71, 85, 105, 200],
        }),
        new HexagonLayer({
          id: 'hex-equity',
          data: hexData,
          gpuAggregation: false,
          radius: 9000,
          coverage: 0.92,
          extruded: true,
          elevationScale: 64,
          getPosition: (d) => d.position,
          getColorValue: (pts) =>
            pts.length ? pts.reduce((s, p) => s + p.final_score, 0) / pts.length : 0,
          colorDomain: [0, 100],
          colorRange: HEX_COLOR_RANGE,
          opacity,
          pickable: true,
          material: MATTE_3D,
        }),
      ];
    }

    return [
      new GeoJsonLayer({
        id: 'counties-3d',
        data: geojson,
        opacity,
        pickable: true,
        stroked: true,
        filled: true,
        extruded: true,
        wireframe: false,
        elevationScale: 1,
        getElevation: (d) => d.properties._elevation || 0,
        getFillColor: (d) => {
          const rgb = fillForDominant(d.properties._dominant);
          const a = d.properties._dominant === 'none' ? 200 : 245;
          return [rgb[0], rgb[1], rgb[2], a];
        },
        getLineColor: [15, 23, 42, 240],
        lineWidthMinPixels: 0.6,
        getLineWidth: 1,
        material: MATTE_3D,
        updateTriggers: {
          getFillColor: [opacity, geojson, maxCountyAccounts],
          getElevation: [maxCountyAccounts, geojson],
        },
      }),
    ];
  }, [geojson, mode, hexData, opacity, maxCountyAccounts]);

  const resetView = () => {
    setViewState({ ...INITIAL_VIEW });
    mapRef.current?.getMap?.()?.flyTo?.({
      center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
      zoom: INITIAL_VIEW.zoom,
      pitch: INITIAL_VIEW.pitch,
      bearing: INITIAL_VIEW.bearing,
      duration: 800,
    });
  };

  const panelAccountsRaw = selectedCounty ? accountsByCounty.get(selectedCounty) || [] : [];
  const fq = countyFilter.trim().toLowerCase();
  const panelAccounts = fq
    ? panelAccountsRaw.filter(
        (a) =>
          a.account_hash.toLowerCase().includes(fq)
          || (a.ward && a.ward.toLowerCase().includes(fq))
          || String(a.final_score).includes(fq),
      )
    : panelAccountsRaw;

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden flex flex-col relative h-full min-h-[280px] ${className}`}
    >
      <div className="relative flex-1 min-h-[240px]">
        <MapLibreMap
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          onLoad={(e) => {
            const map = e.target;
            if (!map || typeof map.getPitch !== 'function') return;
            if (map.getPitch() < 12) {
              map.easeTo({ pitch: INITIAL_VIEW.pitch, duration: 400 });
            }
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={MAP_STYLE}
          mapLib={maplibregl}
          dragPan
          scrollZoom
          dragRotate
          touchZoomRotate
          touchPitch
          pitchWithRotate
          maxPitch={60}
          minZoom={5}
          maxZoom={12}
          maxBounds={[
            [KENYA_BOUNDS.west - 0.15, KENYA_BOUNDS.south - 0.15],
            [KENYA_BOUNDS.east + 0.15, KENYA_BOUNDS.north + 0.15],
          ]}
          attributionControl={false}
        >
          <DeckGLOverlay
            interleaved={false}
            layers={layers}
            onHover={onHoverDeck}
            onClick={onClickDeck}
          />
        </MapLibreMap>

        {!geojson?.features?.length && (
          <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-2 bg-slate-950 text-slate-400 text-xs pointer-events-none">
            <div className="h-8 w-8 rounded-full border-2 border-slate-600 border-t-sky-500 animate-spin" aria-hidden />
            <span>Loading county geometry for 3D view…</span>
          </div>
        )}

        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 w-[210px] rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur-md p-3 shadow-xl text-xs text-slate-200">
          <div className="inline-flex rounded-full border border-slate-600 bg-slate-800/90 p-0.5 self-end font-semibold">
            <button
              type="button"
              className={`px-2.5 py-1 rounded-full text-[11px] ${mode === 'county' ? 'bg-slate-950 text-sky-300 shadow-inner ring-1 ring-slate-600' : 'text-slate-400 hover:text-slate-200'}`}
              onClick={() => {
                setMode('county');
                setHover(null);
                setHexHover(null);
              }}
            >
              County View
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded-full text-[11px] ${mode === 'heatmap' ? 'bg-slate-950 text-sky-300 shadow-inner ring-1 ring-slate-600' : 'text-slate-400 hover:text-slate-200'}`}
              onClick={() => {
                setMode('heatmap');
                setHover(null);
                setHexHover(null);
                setSelectedCounty(null);
              }}
            >
              Heat Map
            </button>
          </div>
          <button
            type="button"
            className="py-1.5 rounded-lg border border-slate-600 text-slate-200 font-semibold hover:bg-slate-800 text-[11px]"
            onClick={resetView}
          >
            Reset view
          </button>
          <label className="flex flex-col gap-1">
            <span className="text-slate-400">Opacity</span>
            <input
              type="range"
              min={0.25}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="accent-sky-500"
            />
          </label>
          <div className="pt-2 border-t border-slate-700 space-y-1">
            <div className="font-semibold text-slate-100 text-[11px]">Legend</div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ background: '#16A34A' }} />
              <span className="text-slate-400">Majority Vulnerable</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ background: '#D97706' }} />
              <span className="text-slate-400">Mixed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ background: '#DC2626' }} />
              <span className="text-slate-400">Majority Luxury / Leakage</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ background: '#9CA3AF' }} />
              <span className="text-slate-400">No cohort data</span>
            </div>
            {mode === 'heatmap' && (
              <p className="text-[10px] text-slate-500 leading-snug mt-1">
                3D hex (matte): colour ≈ mean score; height ≈ density — Kenya only.
              </p>
            )}
            {mode === 'county' && (
              <p className="text-[10px] text-slate-500 leading-snug mt-1">
                3D counties (matte): height ≈ cohort size — tilt with right-drag or Ctrl+drag (trackpad: two-finger rotate).
              </p>
            )}
          </div>
        </div>

        <div className="absolute bottom-1 left-2 z-10 text-[10px] text-slate-500 bg-slate-900/85 px-2 py-0.5 rounded border border-slate-700 pointer-events-none">
          Dark basemap © CARTO · Boundaries: OpenStreetMap / Kenya election data
        </div>

        {hexHover && mode === 'heatmap' && (
          <div
            className="absolute z-20 pointer-events-none rounded-xl border border-slate-600 bg-slate-900 shadow-xl p-3 text-xs w-[220px] text-slate-200"
            style={{
              left: Math.min(Math.max(hexHover.x + 12, 8), 8),
              top: Math.min(Math.max(hexHover.y + 12, 8), 120),
            }}
          >
            <div className="font-bold text-slate-50 text-sm mb-1">Hex cell</div>
            <div className="text-slate-400 mb-1">
              Centre:{' '}
              <span className="font-mono text-[10px] text-slate-200">
                {hexHover.lng.toFixed(3)}, {hexHover.lat.toFixed(3)}
              </span>
            </div>
            <div className="text-slate-400 mb-1">
              Accounts: <span className="font-semibold text-slate-100">{hexHover.count}</span>
            </div>
            <div className="text-slate-400">
              Avg score: <span className="font-mono font-bold text-sky-300">{hexHover.avg.toFixed(1)}</span>
            </div>
          </div>
        )}

        {hover && mode === 'county' && (
          <div
            className="absolute z-20 pointer-events-none rounded-xl border border-slate-600 bg-slate-900 shadow-xl p-3 text-xs w-[240px] text-slate-200"
            style={{
              left: Math.min(Math.max(hover.x + 12, 8), 8),
              top: Math.min(Math.max(hover.y + 12, 8), 120),
            }}
          >
            <div className="font-bold text-slate-50 text-sm mb-2">{hover.county}</div>
            <div className="text-slate-400 mb-1">
              Total accounts: <span className="font-semibold text-slate-100">{hover.row.total}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-800 font-bold">
                G {hover.row.GREEN}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-800 font-bold">
                Y {hover.row.YELLOW}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-red-950/90 text-red-300 border border-red-800 font-bold">
                R {hover.row.RED}
              </span>
            </div>
            <div className="text-slate-400 mb-1">
              KNBS poverty index:{' '}
              <span className="font-semibold text-slate-100">{hover.poverty?.toFixed?.(1) ?? hover.poverty}%</span>
            </div>
            <div className="text-slate-400 mb-1">
              Dominant flag:{' '}
              <span className="font-semibold text-slate-100">{hover.flag || '—'}</span>
            </div>
            <div className="text-slate-400">
              Avg equity score:{' '}
              <span className="font-mono font-bold text-sky-300">{hover.row.avg_equity_score}</span>
            </div>
          </div>
        )}
      </div>

      {selectedCounty && (
        <div className="absolute inset-0 z-30 flex justify-end animate-fade-in">
          <button
            type="button"
            className="flex-1 min-w-0 bg-black/55 cursor-default"
            aria-label="Close county panel"
            onClick={() => setSelectedCounty(null)}
          />
          <div className="w-full max-w-md bg-slate-950 border-l border-slate-700 shadow-2xl flex flex-col h-full text-slate-200">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between gap-2">
            <div>
              <div className="text-xs text-slate-500 uppercase">County</div>
              <div className="text-lg font-bold text-sky-400">{selectedCounty}</div>
              <div className="text-xs text-slate-500 mt-1">{panelAccounts.length} accounts</div>
            </div>
            <button
              type="button"
              className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-600 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              onClick={() => setSelectedCounty(null)}
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            <input
              value={countyFilter}
              onChange={(e) => setCountyFilter(e.target.value)}
              placeholder="Filter by account, ward, score…"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
            />
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-700">
                  <th className="py-2 pr-2">Account</th>
                  <th className="py-2 pr-2">Score</th>
                  <th className="py-2 pr-2">Class</th>
                  <th className="py-2">Flags</th>
                </tr>
              </thead>
              <tbody>
                {panelAccounts.map((a) => (
                  <tr key={a.account_hash} className="border-b border-slate-800 hover:bg-slate-900/80">
                    <td className="py-2 pr-2 font-mono font-semibold">
                      <button
                        type="button"
                        className="text-sky-400 hover:text-sky-300 underline text-left"
                        onClick={() => navigate(`/lookup?account=${encodeURIComponent(a.account_hash)}`)}
                      >
                        {a.account_hash}
                      </button>
                    </td>
                    <td className="py-2 pr-2 font-mono text-slate-300">{a.final_score}</td>
                    <td className="py-2 pr-2">
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                          a.classification === 'GREEN'
                            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
                            : a.classification === 'YELLOW'
                              ? 'bg-amber-950/90 text-amber-300 border-amber-800'
                              : 'bg-red-950/90 text-red-300 border-red-800'
                        }`}
                      >
                        {a.classification}
                      </span>
                    </td>
                    <td className="py-2 text-slate-500 truncate max-w-[100px]" title={(a.flags || []).join(', ')}>
                      {(a.flags || []).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {panelAccounts.length === 0 && (
              <p className="text-sm text-slate-500 p-4">No synthetic accounts mapped to this county.</p>
            )}
          </div>
          <div className="p-3 border-t border-slate-700 text-[11px] text-slate-500">
            Tip: open full{' '}
            <Link to="/lookup" className="text-sky-400 font-semibold hover:text-sky-300">
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
