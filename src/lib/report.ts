import {
  average,
  dateRange,
  dayMonth,
  dayMonthLong,
  feelingLabel,
  layerLabel,
  monthYear,
  oneDecimal,
  shortDateTime,
  time,
} from './format';
import { range, severityTrend } from './insights';
import type { SymptomRecord } from './types';

const listDates = (rs: SymptomRecord[]) => {
  const days = rs.map((r) => new Date(r.at).getDate());
  const month = rs.length ? dayMonth(new Date(rs[0].at)).split(' ')[1] : '';
  if (days.length <= 1) return `${days[0]} ${month}`;
  return `${days.slice(0, -1).join(', ')} and ${days.at(-1)} ${month}`;
};

const symptomLabel = (r: SymptomRecord) => `${r.location || 'Unmarked'} · ${feelingLabel(r.feeling)}`;

/** One entry per location + feeling, most-logged first. */
function groupSymptoms(chrono: SymptomRecord[]) {
  const groups = new Map<string, SymptomRecord[]>();
  for (const r of chrono) {
    const key = `${r.location}|${r.feeling}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.values()]
    .sort((a, b) => b.length - a.length)
    .map((rs) => {
      const severities = rs.map((r) => r.severity);
      const [lo, hi] = range(severities);
      return {
        label: symptomLabel(rs[0]),
        count: rs.length,
        avgSeverity: oneDecimal(average(severities)),
        severityRange: `${lo}–${hi}`,
        avgDuration: Math.round(average(rs.map((r) => r.durationMin))),
        depth: [...new Set(rs.map((r) => layerLabel(r.layer)))].join(', '),
        first: dayMonth(new Date(rs[0].at)),
        last: dayMonth(new Date(rs.at(-1)!.at)),
        points: rs.map((r) => ({ at: Date.parse(r.at), severity: r.severity })),
      };
    });
}

/** Everything the clinician report shows, derived from the patient's marked records. */
export function buildReport(newestFirst: SymptomRecord[], patient = 'Alex Lee', now = new Date()) {
  const chrono = [...newestFirst].reverse();
  const n = chrono.length;
  const severities = chrono.map((r) => r.severity);
  const durations = chrono.map((r) => r.durationMin);
  const days = new Set(chrono.map((r) => new Date(r.at).toDateString())).size;
  const [sevLo, sevHi] = range(severities);
  const [durLo, durHi] = range(durations);
  const first = chrono[0];
  const latest = chrono.at(-1);
  const span = first && latest ? dateRange(new Date(first.at), new Date(latest.at)) : '';
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

  const mentions = (re: RegExp) => chrono.filter((r) => re.test(r.note));
  const desk = mentions(/desk/i);
  const armWorse = mentions(/(rais|lift|elevat)\w*\s+(my\s+)?arm|arm\s+elevation/i);
  const rest = mentions(/\brest\b/i);
  const clauses = [
    armWorse.length ? `arm elevation worsens symptoms on ${listDates(armWorse)}` : '',
    rest.length ? `rest eases symptoms on ${listDates(rest)}` : '',
  ].filter(Boolean);
  const effects = clauses.length ? `${clauses.join('; ')}.` : '';
  const context = [
    desk.length ? `${desk.length === n ? `All ${n}` : desk.length} entries mention desk work.` : '',
    effects.charAt(0).toUpperCase() + effects.slice(1),
  ]
    .filter(Boolean)
    .join(' ');

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
    symptoms: groupSymptoms(chrono),
    logs: chrono.map((r) => ({
      id: r.id,
      at: Date.parse(r.at),
      when: shortDateTime(new Date(r.at)),
      symptom: symptomLabel(r),
      severity: `${r.severity} / 10`,
      duration: `${r.durationMin} min`,
      note: r.note,
    })),
    summary,
    count: n,
  };
}

export type Report = ReturnType<typeof buildReport>;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Line colour per symptom, in symptom order. Symptoms past the palette are grey. */
const SERIES = ['#202522', '#b94a45', '#3e7ca6', '#c4895a', '#6b8f5e'];
const seriesColor = (i: number) => SERIES[i] ?? '#9aa29c';

/** Severity 0–10 over time, one line per symptom, as inline SVG so the print WebView needs no chart library. */
function severityChartSvg(r: Report) {
  const W = 520;
  const H = 200;
  const [left, right, top, bottom] = [28, 12, 8, 24];
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const first = r.logs[0]?.at ?? 0;
  const span = (r.logs.at(-1)?.at ?? 0) - first;
  const x = (at: number) => left + (span > 0 ? ((at - first) / span) * plotW : plotW / 2);
  const y = (severity: number) => top + ((10 - severity) / 10) * plotH;

  const grid = [10, 5, 0]
    .map(
      (v) =>
        `<line x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}" stroke="#e6e9e3"/>` +
        `<text x="${left - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#68716b">${v}</text>`,
    )
    .join('');
  const lines = r.symptoms
    .map((s, i) => {
      const color = seriesColor(i);
      const pts = s.points.map((p) => `${x(p.at).toFixed(1)},${y(p.severity).toFixed(1)}`);
      const dots = s.points
        .map((p) => `<circle cx="${x(p.at).toFixed(1)}" cy="${y(p.severity).toFixed(1)}" r="3.5" fill="${color}" stroke="#fff" stroke-width="1.5"/>`)
        .join('');
      return `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>${dots}`;
    })
    .join('');
  const sampled =
    r.logs.length <= 6 ? r.logs : Array.from({ length: 6 }, (_, i) => r.logs[Math.round((i * (r.logs.length - 1)) / 5)]);
  const dates = sampled
    .map((l, i) => {
      const anchor = sampled.length === 1 ? 'middle' : i === 0 ? 'start' : i === sampled.length - 1 ? 'end' : 'middle';
      return `<text x="${x(l.at).toFixed(1)}" y="${H - 6}" text-anchor="${anchor}" font-size="11" fill="#68716b">${esc(dayMonth(new Date(l.at)))}</text>`;
    })
    .join('');
  const legend =
    r.symptoms.length > 1
      ? `<div class="legend">${r.symptoms
          .map((s, i) => `<span><i style="background:${seriesColor(i)}"></i>${esc(s.label)}</span>`)
          .join('')}</div>`
      : '';
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">${grid}${lines}${dates}</svg>${legend}`;
}

/** Printable HTML for Export PDF / Send to clinician. */
export function reportHtml(r: Report) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#202522;margin:40px;}
  h1{font-size:26px;margin:4px 0}.muted{color:#68716b}.brand{font-size:18px}
  .grid{display:flex;gap:12px;margin:20px 0}.tile{flex:1;background:#f0f2ed;border-radius:14px;padding:14px}
  .tile b{display:block;font-size:24px;font-weight:500;margin:4px 0}.fact{background:#f0f2ed;border-radius:14px;padding:12px;margin:8px 0}
  .fact small{color:#68716b;display:block;margin-bottom:4px}table{border-collapse:collapse;width:100%;margin-top:8px}
  td,th{text-align:left;vertical-align:top;padding:6px 8px;border-bottom:1px solid #e6e9e3;font-size:13px}.summary{background:#e6eff3;border-radius:14px;padding:14px;margin-top:16px}
  .symptoms{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}
  .symptom{background:#f0f2ed;border-radius:14px;padding:12px;font-size:13px;line-height:1.5}.symptom b{display:block;font-size:14px;margin-bottom:4px}
  .chart{margin-top:8px}.legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;margin-top:6px}
  .legend i{display:inline-block;width:10px;height:10px;border-radius:5px;margin-right:6px;vertical-align:-1px}
  .symptom,.chart,.summary,tr{break-inside:avoid}thead{display:table-header-group}td.note{color:#68716b}td.nw{white-space:nowrap}
  </style></head><body>
  <div class="brand">soma</div><h1>Symptom history summary</h1><div class="muted">${esc(r.subtitle)}</div>
  <div class="grid">${r.metrics
    .map((m) => `<div class="tile"><small class="muted">${esc(m.label)}</small><b>${esc(m.value)}</b><small class="muted">${esc(m.caption)}</small></div>`)
    .join('')}</div>
  <h3>Patient-reported symptoms</h3><div class="muted">Source: ${r.count} saved records</div>
  ${r.facts.map((f) => `<div class="fact"><small>${esc(f.label)}</small>${esc(f.text)}</div>`).join('')}
  <h3>Specific symptoms</h3>
  <div class="symptoms">${r.symptoms
    .map(
      (s) =>
        `<div class="symptom"><b>${esc(s.label)}</b>${s.count} log${s.count === 1 ? '' : 's'} · ${esc(
          s.first === s.last ? s.first : `${s.first}–${s.last}`,
        )}<br>Avg ${esc(s.avgSeverity)} / 10 (range ${esc(s.severityRange)})<br>Avg ${s.avgDuration} min<br><span class="muted">${esc(
          s.depth,
        )} depth</span></div>`,
    )
    .join('')}</div>
  <div class="chart"><h3>Severity over time</h3>${severityChartSvg(r)}
  <div class="muted" style="font-size:12px;margin-top:6px">Each dot is one saved entry. Patient-reported severity / 10.</div></div>
  <div class="summary"><b>Summary</b><p>${esc(r.summary)}</p></div>
  <h3>All logs (${r.count})</h3>
  <table><thead><tr><th>Date &amp; time</th><th>Symptom</th><th>Severity</th><th>Duration</th><th>Note</th></tr></thead><tbody>${r.logs
    .map(
      (l) =>
        `<tr><td class="nw">${esc(l.when)}</td><td>${esc(l.symptom)}</td><td class="nw">${esc(l.severity)}</td><td class="nw">${esc(l.duration)}</td><td class="note">${esc(
          l.note,
        )}</td></tr>`,
    )
    .join('')}</tbody></table>
  <p class="muted" style="font-size:12px;margin-top:16px">Not a diagnosis or medical assessment. Self-reported logs are incomplete and unverified. No examination, medical test results or external disease comparisons are included.</p>
  </body></html>`;
}
