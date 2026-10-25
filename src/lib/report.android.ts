import { average, dateRange, dayMonth, dayMonthLong, feelingLabel, layerLabel, monthYear, oneDecimal, time } from './format';
import { range, severityTrend } from './insights';
import type { SymptomRecord } from './types';

const listDates = (rs: SymptomRecord[]) => {
  const days = rs.map((r) => new Date(r.at).getDate());
  const month = rs.length ? dayMonth(new Date(rs[0].at)).split(' ')[1] : '';
  if (days.length <= 1) return `${days[0]} ${month}`;
  return `${days.slice(0, -1).join(', ')} and ${days.at(-1)} ${month}`;
};

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
    summary,
    count: n,
  };
}

export type Report = ReturnType<typeof buildReport>;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Printable HTML for Export PDF / Send to clinician. */
export function reportHtml(r: Report) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#202522;margin:40px;}
  h1{font-size:26px;margin:4px 0}.muted{color:#68716b}.brand{font-size:18px}
  .grid{display:flex;gap:12px;margin:20px 0}.tile{flex:1;background:#f0f2ed;border-radius:14px;padding:14px}
  .tile b{display:block;font-size:24px;font-weight:500;margin:4px 0}.fact{background:#f0f2ed;border-radius:14px;padding:12px;margin:8px 0}
  .fact small{color:#68716b;display:block;margin-bottom:4px}table{border-collapse:collapse;width:100%;margin-top:8px}
  td,th{text-align:left;padding:6px 8px;border-bottom:1px solid #e6e9e3;font-size:13px}.summary{background:#e6eff3;border-radius:14px;padding:14px;margin-top:16px}
  </style></head><body>
  <div class="brand">Iris</div><h1>Symptom history summary</h1><div class="muted">${esc(r.subtitle)}</div>
  <div class="grid">${r.metrics
    .map((m) => `<div class="tile"><small class="muted">${esc(m.label)}</small><b>${esc(m.value)}</b><small class="muted">${esc(m.caption)}</small></div>`)
    .join('')}</div>
  <h3>Patient-reported symptoms</h3><div class="muted">Source: ${r.count} saved records</div>
  ${r.facts.map((f) => `<div class="fact"><small>${esc(f.label)}</small>${esc(f.text)}</div>`).join('')}
  <h3>Recorded history · ${esc(r.month)}</h3>
  <table><tr><th>Date</th><th>Severity</th><th>Duration</th></tr>${r.history
    .map((h) => `<tr><td>${esc(h.day)}</td><td>${esc(h.severity)}</td><td>${esc(h.duration)}</td></tr>`)
    .join('')}</table>
  <div class="summary"><b>Summary</b><p>${esc(r.summary)}</p></div>
  <p class="muted" style="font-size:12px;margin-top:16px">Not a diagnosis or medical assessment. Self-reported logs are incomplete and unverified. No examination, medical test results or external disease comparisons are included.</p>
  </body></html>`;
}
