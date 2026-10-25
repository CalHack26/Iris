import { SENSOR_END, sensorSeries, SENSORS } from '@/data/seed';
import { colors } from '@/theme/tokens';

import {
  average,
  date,
  dateRange,
  dayMonth,
  dayMonthLong,
  feelingLabel,
  layerLabel,
  monthYear,
  oneDecimal,
  shortLocation,
  time,
} from './format';
import { range, sampleLabels, severityTrend } from './insights';
import type { SensorKind, SymptomRecord } from './types';

const DAY_MS = 86_400_000;
const SENSOR_KINDS: SensorKind[] = ['heartRate', 'temperature', 'respiratory'];

const listDates = (rs: SymptomRecord[]) => {
  const days = rs.map((r) => new Date(r.at).getDate());
  const month = rs.length ? dayMonth(new Date(rs[0].at)).split(' ')[1] : '';
  if (days.length <= 1) return `${days[0]} ${month}`;
  return `${days.slice(0, -1).join(', ')} and ${days.at(-1)} ${month}`;
};

/** Desk work, arm elevation and rest mentioned in the notes of `rs`, as one or two sentences. */
const contextFor = (rs: SymptomRecord[]) => {
  const mentions = (re: RegExp) => rs.filter((r) => re.test(r.note));
  const desk = mentions(/desk/i);
  const armWorse = mentions(/(rais|lift|elevat)\w*\s+(my\s+)?arm|arm\s+elevation/i);
  const rest = mentions(/\brest\b/i);
  const clauses = [
    armWorse.length ? `arm elevation worsens symptoms on ${listDates(armWorse)}` : '',
    rest.length ? `rest eases symptoms on ${listDates(rest)}` : '',
  ].filter(Boolean);
  const effects = clauses.length ? `${clauses.join('; ')}.` : '';
  const deskCount = desk.length === rs.length && rs.length > 1 ? `All ${rs.length}` : String(desk.length);
  return [
    desk.length ? `${deskCount} ${desk.length === 1 ? 'entry mentions' : 'entries mention'} desk work.` : '',
    effects.charAt(0).toUpperCase() + effects.slice(1),
  ]
    .filter(Boolean)
    .join(' ');
};

const dayCount = (rs: SymptomRecord[]) => new Set(rs.map((r) => new Date(r.at).toDateString())).size;

/** "Range 2–5 / 10", or a plain note when there is nothing to range over. */
const rangeText = (rs: SymptomRecord[], lo: number, hi: number, unit: string) =>
  rs.length === 1 ? 'Single entry' : lo === hi ? 'Same in every entry' : `Range ${lo}–${hi}${unit}`;

/** One block per marked symptom (location + feeling), most-recorded first. */
function groupSymptoms(chrono: SymptomRecord[]) {
  const groups = new Map<string, SymptomRecord[]>();
  for (const r of chrono) {
    const key = `${r.location}|${r.feeling}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.values()]
    .sort((a, b) => b.length - a.length || Date.parse(b.at(-1)!.at) - Date.parse(a.at(-1)!.at))
    .map((rs) => {
      const first = rs[0];
      const latest = rs.at(-1)!;
      const [sevLo, sevHi] = range(rs.map((r) => r.severity));
      const [durLo, durHi] = range(rs.map((r) => r.durationMin));
      const days = dayCount(rs);
      return {
        key: `${first.location}|${first.feeling}`,
        title: `${shortLocation(first.location).trim()} · ${feelingLabel(first.feeling)}`,
        location: first.location,
        depth: [...new Set(rs.map((r) => layerLabel(r.layer)))].join(', '),
        overview: `${rs.length} ${rs.length === 1 ? 'entry' : 'entries'} · ${days} day${days === 1 ? '' : 's'} · ${
          days === 1 ? date(new Date(latest.at)) : dateRange(new Date(first.at), new Date(latest.at))
        }`,
        severity: {
          value: `${oneDecimal(average(rs.map((r) => r.severity)))} / 10`,
          range: rangeText(rs, sevLo, sevHi, ' / 10'),
        },
        duration: {
          value: `${Math.round(average(rs.map((r) => r.durationMin)))} min`,
          range: rangeText(rs, durLo, durHi, ' minutes'),
        },
        context: contextFor(rs),
        latest: `${dayMonth(new Date(latest.at))}, ${time(new Date(latest.at))} · ${latest.severity}/10 · ${latest.durationMin} minutes.${
          latest.note ? ` “${latest.note}”` : ''
        }`,
      };
    });
}

/** The wearable's daily averages for the week ending SENSOR_END, as shown on the Sensors tab. */
function sensorWeek() {
  const end = SENSOR_END;
  const start = new Date(end.getTime() - 6 * DAY_MS);
  const mid = new Date((start.getTime() + end.getTime()) / 2);
  return {
    span: dateRange(start, end),
    charts: SENSOR_KINDS.map((kind) => {
      const meta = SENSORS[kind];
      const values = sensorSeries(kind, 'week', 0);
      const fmt = (v: number) => v.toFixed(meta.decimals);
      return {
        kind,
        title: meta.title,
        caption: meta.caption,
        ticks: meta.ticks,
        decimals: meta.decimals,
        values,
        axis: [dayMonth(start), dayMonth(mid), dayMonth(end)].map((text, i) => ({ text, pos: i / 2 })),
        rangeText: `Daily averages ${fmt(Math.min(...values))}–${fmt(Math.max(...values))} ${meta.unit}`,
      };
    }),
  };
}

/** Everything the clinician report shows, derived from the patient's marked records. */
export function buildReport(newestFirst: SymptomRecord[], patient = 'Alex Lee', now = new Date()) {
  const chrono = [...newestFirst].reverse();
  const n = chrono.length;
  const severities = chrono.map((r) => r.severity);
  const durations = chrono.map((r) => r.durationMin);
  const days = dayCount(chrono);
  const [sevLo, sevHi] = range(severities);
  const [durLo, durHi] = range(durations);
  const first = chrono[0];
  const latest = chrono.at(-1);
  const span = first && latest ? dateRange(new Date(first.at), new Date(latest.at)) : '';
  const firstAt = first ? Date.parse(first.at) : 0;
  const spanMs = latest ? Date.parse(latest.at) - firstAt : 0;
  const spanLong =
    first && latest ? `${new Date(first.at).getDate()}–${dayMonthLong(new Date(latest.at))} ${new Date(latest.at).getFullYear()}` : '';

  const locations = new Set(chrono.map((r) => r.location));
  const feelings = new Set(chrono.map((r) => r.feeling));
  const layers = new Set(chrono.map((r) => r.layer));

  const locationFact =
    locations.size === 1 && feelings.size === 1 && first
      ? `${first.location} · ${feelingLabel(first.feeling)} pain in all ${n} records.`
      : `${locations.size} marked locations: ${[...locations].join(', ')}.`;
  const layerFact =
    layers.size === 1 && first
      ? `${layerLabel(first.layer)} depth. Location is not clinically confirmed.`
      : `Mixed depths (${[...layers].map(layerLabel).join(', ')}). Location is not clinically confirmed.`;

  const context = contextFor(chrono);

  const latestFact = latest
    ? `${dayMonth(new Date(latest.at))}, ${time(new Date(latest.at))} · ${latest.severity}/10 · ${latest.durationMin} minutes.${
        /no numbness/i.test(latest.note)
          ? ' Reports no numbness or tingling in this entry only; not assessed in the other entries.'
          : latest.note
            ? ` “${latest.note}”`
            : ''
      }`
    : '';

  const trend = severityTrend(newestFirst);
  const half = trend.half;
  const early = chrono.slice(0, half);
  const late = chrono.slice(n - half);
  const window = (rs: SymptomRecord[]) =>
    rs.length ? `${dateRange(new Date(rs[0].at), new Date(rs.at(-1)!.at)).replace(/ \d{4}$/, '')}, ${rs.length} logs` : '';
  const durBefore = average(early.map((r) => r.durationMin));
  const durAfter = average(late.map((r) => r.durationMin));
  const verb = (a: number, b: number) => (b > a ? 'increased' : b < a ? 'decreased' : 'stayed');
  const summary =
    half > 0
      ? `Average severity ${verb(trend.before, trend.after)} from ${oneDecimal(trend.before)}/10 (${window(early)}) to ${oneDecimal(
          trend.after,
        )}/10 (${window(late)}). Average duration ${verb(durBefore, durAfter)} from ${Math.round(durBefore)} to ${Math.round(
          durAfter,
        )} minutes. This describes recorded entries only; it does not establish a cause or a worsening condition.`
      : 'Not enough entries to compare periods yet.';

  return {
    patient,
    subtitle: `${patient} · ${spanLong} · Prepared ${dayMonthLong(now)} ${now.getFullYear()}`,
    span,
    month: latest ? monthYear(new Date(latest.at)) : '',
    metrics: [
      { label: 'Recorded episodes', value: String(n), caption: `${days} separate day${days === 1 ? '' : 's'}` },
      { label: 'Average severity', value: `${oneDecimal(average(severities))} / 10`, caption: `Range ${sevLo}–${sevHi} / 10` },
      {
        label: 'Average duration',
        value: `${Math.round(average(durations))} min`,
        caption: `Range ${durLo}–${durHi} minutes`,
      },
    ],
    facts: [
      { label: 'Location & feeling', text: locationFact },
      { label: 'Patient-selected layer', text: layerFact },
      ...(context ? [{ label: 'Context', text: context }] : []),
      ...(latestFact ? [{ label: 'Latest entry', text: latestFact }] : []),
    ],
    history: chrono.map((r) => ({
      id: r.id,
      day: dayMonth(new Date(r.at)),
      severity: `${r.severity} / 10`,
      duration: `${r.durationMin} min`,
      durationMin: r.durationMin,
    })),
    summary,
    count: n,
    symptoms: groupSymptoms(chrono),
    severityChart: {
      values: severities,
      xs: spanMs > 0 ? chrono.map((r) => (Date.parse(r.at) - firstAt) / spanMs) : undefined,
      labels: sampleLabels(chrono).map((r) => ({
        text: dayMonth(new Date(r.at)),
        pos: spanMs > 0 ? (Date.parse(r.at) - firstAt) / spanMs : chrono.indexOf(r) / Math.max(n - 1, 1),
      })),
    },
    sensors: sensorWeek(),
    log: chrono.map((r) => ({
      id: r.id,
      day: dayMonth(new Date(r.at)),
      time: time(new Date(r.at)),
      location: r.location || '—',
      feeling: feelingLabel(r.feeling),
      layer: layerLabel(r.layer),
      severity: `${r.severity}/10`,
      duration: `${r.durationMin} min`,
      note: r.note,
      tags: r.tags,
    })),
  };
}

export type Report = ReturnType<typeof buildReport>;


const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Chart width inside a card: US Letter (612pt) less the 36pt @page margins and 12pt card padding. CSS scales it to fit. */
const CHART_WIDTH = 516;

type ChartOptions = {
  values: number[];
  /** Optional 0–1 horizontal position per value; points are evenly spaced when omitted. */
  xs?: number[];
  min: number;
  max: number;
  height: number;
  /** Values at which to draw gridlines and y-axis labels. */
  ticks: readonly number[];
  decimals: number;
  /** Date labels under the plot, at a 0–1 position on the same scale as `xs`. */
  xLabels: { text: string; pos: number }[];
  highlight: string;
};

/** Static SVG twin of components/LineChart for the PDF, where there is no layout pass to measure width. */
function svgLineChart({ values, xs, min, max, height, ticks, decimals, xLabels, highlight }: ChartOptions) {
  const width = CHART_WIDTH;
  const gutter = 30;
  const axisH = 18;
  const plotW = width - gutter;
  const plotH = height - axisH;
  const insetX: [number, number] = [9, 10];
  const insetY: [number, number] = [6, 6];
  const span = max - min || 1;
  const y = (v: number) => insetY[0] + ((max - v) / span) * (plotH - insetY[0] - insetY[1]);
  const at = (pos: number) => gutter + insetX[0] + pos * (plotW - insetX[0] - insetX[1]);
  const x = (i: number) => at(xs && xs.length === values.length ? xs[i] : values.length > 1 ? i / (values.length - 1) : 0);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const text = (tx: number, ty: number, anchor: string, label: string) =>
    `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${anchor}" font-size="9" fill="${colors.muted}">${esc(label)}</text>`;

  const grid = ticks
    .map((t) => {
      const gy = Math.round(y(t));
      return `<rect x="${gutter}" y="${gy}" width="${plotW}" height="1" fill="${colors.divider}"/>${text(gutter - 6, gy + 3, 'end', t.toFixed(decimals))}`;
    })
    .join('');
  const column = values.length
    ? `<rect x="${(Math.min(x(values.length - 1) - 10, width - 20)).toFixed(1)}" y="0" width="20" height="${plotH}" rx="10" fill="${highlight}"/>`
    : '';
  const dots = values
    .map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="${colors.ink}" stroke="${colors.white}" stroke-width="1.5"/>`)
    .join('');
  // Drop labels that would collide with the previous one, always keeping the newest date.
  const minGap = 36;
  const spaced = xLabels.reduce<typeof xLabels>((kept, l) => {
    const prev = kept.at(-1);
    if (!prev || at(l.pos) - at(prev.pos) >= minGap) return [...kept, l];
    return l === xLabels.at(-1) ? [...kept.slice(0, -1), l] : kept;
  }, []);
  // Edge labels hang inward so they stay on the page.
  const labels = spaced
    .map(({ text: label, pos }) =>
      pos < 0.05
        ? text(at(pos) - insetX[0], height - 4, 'start', label)
        : pos > 0.95
          ? text(at(pos) + insetX[1], height - 4, 'end', label)
          : text(at(pos), height - 4, 'middle', label),
    )
    .join('');

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${column}${grid}<path d="${d}" stroke="${colors.ink}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" fill="none"/>${dots}${labels}</svg>`;
}

const DISCLAIMER =
  'Not a diagnosis or medical assessment. Self-reported logs are incomplete and unverified. No examination, medical test results or external disease comparisons are included.';

/** Printable HTML for Export PDF / Send to clinician: symptoms first, then trends, then the full record log. */
export function reportHtml(r: Report) {
  const symptoms = r.symptoms
    .map(
      (s) => `<section class="block">
      <h3>${esc(s.title)}</h3>
      <div class="muted small">${esc(s.location)} · ${esc(s.depth)} depth · ${esc(s.overview)}</div>
      <div class="stats">
        <div class="stat"><small>Severity</small><b>${esc(s.severity.value)}</b><small>${esc(s.severity.range)}</small></div>
        <div class="stat"><small>Duration</small><b>${esc(s.duration.value)}</b><small>${esc(s.duration.range)}</small></div>
      </div>
      ${s.context ? `<p><span class="label">Context</span>${esc(s.context)}</p>` : ''}
      <p><span class="label">Latest entry</span>${esc(s.latest)}</p>
    </section>`,
    )
    .join('');

  const severity = `<section class="block">
    <h3>Severity over time</h3>
    <div class="muted small">Patient-reported severity / 10 · each dot is one saved entry</div>
    <div class="chart">${svgLineChart({
      values: r.severityChart.values,
      xs: r.severityChart.xs,
      min: 0,
      max: 10,
      height: 150,
      ticks: [10, 5, 0],
      decimals: 0,
      xLabels: r.severityChart.labels,
      highlight: colors.accentSoftAlt,
    })}</div>
    <div class="summary">${esc(r.summary)}</div>
  </section>`;

  const sensors = r.sensors.charts.map(
      (c) => `<section class="block">
      <div class="row"><h3>${esc(c.title)} <span class="muted small">${esc(c.caption)}</span></h3><span class="muted small">${esc(
        c.rangeText,
      )}</span></div>
      <div class="chart">${svgLineChart({
        values: c.values,
        min: c.ticks[2],
        max: c.ticks[0],
        height: 70,
        ticks: c.ticks,
        decimals: c.decimals,
        xLabels: c.axis,
        highlight: colors.sage,
      })}</div>
    </section>`,
  );

  const rows = r.log
    .map(
      (l) => `<tr>
      <td class="nowrap">${esc(l.day)}</td><td>${esc(l.time)}</td><td>${esc(l.location)}</td><td>${esc(l.feeling)}</td>
      <td>${esc(l.layer)}</td><td class="nowrap">${esc(l.severity)}</td><td class="nowrap">${esc(l.duration)}</td>
      <td>${esc(l.note)}${l.tags.length ? `<div class="muted">Tags: ${esc(l.tags.join(', '))}</div>` : ''}</td>
    </tr>`,
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  @page{size:letter;margin:36px}
  *{box-sizing:border-box}
  html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:${colors.ink};margin:0;font-size:12px;line-height:1.45}
  h1{font-size:22px;font-weight:500;margin:2px 0}
  h2{font-size:16px;font-weight:600;margin:22px 0 4px;break-after:avoid;page-break-after:avoid}
  h3{font-size:13px;font-weight:600;margin:0 0 2px}h3 .small{font-weight:400}
  p{margin:6px 0 0}
  .brand{font-size:15px}.muted{color:${colors.muted}}.small{font-size:10px}
  .label{display:block;color:${colors.muted};font-size:10px}
  .metrics{display:flex;gap:8px;margin:14px 0 4px}
  .metric{flex:1;background:${colors.field};border-radius:10px;padding:10px}
  .metric b,.stat b{display:block;font-size:18px;font-weight:500;margin:2px 0}
  .metric small,.stat small{display:block;color:${colors.muted};font-size:10px}
  .block{background:${colors.field};border-radius:10px;padding:12px;margin:8px 0;break-inside:avoid;page-break-inside:avoid}
  .stats{display:flex;gap:8px;margin:8px 0 2px}
  .stat{flex:1;background:${colors.white};border-radius:8px;padding:8px}
  .row{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
  .chart{margin:8px 0 4px}.chart svg{display:block;width:100%;height:auto}
  .keep{break-inside:avoid;page-break-inside:avoid}
  .graphs{break-before:page;page-break-before:always;margin-top:0}
  .summary{background:${colors.accentSoftAlt};border-radius:8px;padding:8px 10px;margin-top:6px}
  .data{break-before:page;page-break-before:always;margin-top:0}
  table{border-collapse:collapse;width:100%;font-size:10px}
  thead{display:table-header-group}
  tr{break-inside:avoid;page-break-inside:avoid}
  th{text-align:left;color:${colors.muted};font-weight:600;border-bottom:1px solid ${colors.ink}}
  th,td{padding:5px 4px;vertical-align:top;border-bottom:1px solid ${colors.divider}}
  .nowrap{white-space:nowrap}
  .footer{font-size:10px;margin-top:16px}
  </style></head><body>
  <div class="brand">soma</div>
  <h1>Symptom history summary</h1>
  <div class="muted">${esc(r.subtitle)}</div>
  <div class="metrics">${r.metrics
    .map((m) => `<div class="metric"><small>${esc(m.label)}</small><b>${esc(m.value)}</b><small>${esc(m.caption)}</small></div>`)
    .join('')}</div>

  <h2>Patient-reported symptoms</h2>
  <div class="muted small">Source: ${r.count} saved records · locations and depths are patient-selected and not clinically confirmed</div>
  ${symptoms}

  <h2 class="graphs">Trends</h2>
  ${severity}
  <div class="keep">
    <h2>Wearable sensor data · ${esc(r.sensors.span)}</h2>
    <div class="muted small">From the paired wearable. Not linked to individual symptom entries.</div>
    ${sensors[0] ?? ''}
  </div>
  ${sensors.slice(1).join('')}

  <h2 class="data">Recorded data</h2>
  <div class="muted small" style="margin-bottom:6px">All ${r.count} saved records, oldest first</div>
  <table>
    <thead><tr><th>Date</th><th>Time</th><th>Location</th><th>Feeling</th><th>Layer</th><th>Severity</th><th>Duration</th><th>Note</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <p class="muted footer">${DISCLAIMER}</p>
  </body></html>`;
}
