import readline from 'readline';

const RAW_BASE = process.env.BASE_URL || (() => {
  const arg = process.argv.find((a) => a.startsWith('--api=') || a.startsWith('--base='));
  return arg ? arg.split('=')[1] : 'http://ahcp.hr:8084/ahcp/public';
})();
const BASE = RAW_BASE.replace(/\/+$/, '');
const API_BASE = BASE.endsWith('/api') ? BASE : `${BASE}/api`;
const IGPS_LIST_URL = `${API_BASE}/inward-gate-pass-list`;
const IGPS_UPDATE_URL = `${API_BASE}/inward-gate-pass-update`; // /{id}

console.log('Using API base:', API_BASE);

function nextGatePassReferenceNo(prefix, existingReferenceNos) {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  let max = 0;
  for (const ref of existingReferenceNos) {
    const trimmed = (ref || '').trim();
    if (!trimmed || trimmed === '—') continue;
    const match = trimmed.match(pattern);
    if (match) {
      max = Math.max(max, Number.parseInt(match[1], 10) || 0);
    }
  }
  return `${prefix}-${String(max + 1).padStart(6, '0')}`;
}

async function fetchIgpList() {
  try {
    const res = await fetch(IGPS_LIST_URL, { method: 'GET' });
    if (!res.ok) {
      throw new Error(`Failed to fetch IGP list: ${res.status} ${res.statusText}`);
    }
    return res.json();
  } catch (err) {
    throw new Error(`Failed to fetch IGP list: ${err.message || err}`);
  }
}

function extractItems(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response.filter((item) => item && typeof item === 'object');
  if (typeof response === 'object') {
    const obj = response;
    const arrayKeys = [
      'data',
      'items',
      'results',
      'records',
      'list',
      'inward_gate_passes',
      'inward_gate_pass_list',
      'inwardGatePasses',
      'inwardGatePassList',
      'igpList',
      'igps',
    ];
    for (const key of arrayKeys) {
      const value = obj[key];
      if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object');
    }
    if (
      obj.referenceNo ||
      obj.reference_no ||
      obj.type ||
      obj.baseDocNo ||
      obj.base_doc_no ||
      obj.businessPartnerName ||
      obj.business_partner_name
    ) {
      return [obj];
    }
  }
  return [];
}

function buildPayload(record, newReferenceNo) {
  const payload = { ...record, referenceNo: newReferenceNo };
  delete payload.Id;
  return payload;
}

async function updateIgp(recordId, payload) {
  const url = `${IGPS_UPDATE_URL}/${encodeURIComponent(recordId)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let bodyText = '';
    try {
      bodyText = await res.text();
    } catch (e) {
      bodyText = '<failed to read response body>';
    }
    throw new Error(`Failed to update IGP ${recordId}: ${res.status} ${res.statusText} - ${bodyText}`);
  }
  return res.json();
}

function normalizeReference(ref) {
  return (ref || '').trim();
}

function isTimestampFormat(ref) {
  return /^IGP-\d{14}-\d+$/i.test(ref);
}

async function main() {
  const APPLY = process.argv.includes('--apply');
  console.log(`Fetching IGP records... (mode: ${APPLY ? 'APPLY' : 'DRY-RUN'})`);
  const response = await fetchIgpList();
  const records = extractItems(response);

  const timestampFormatIgps = records.filter((record) => {
    const ref = normalizeReference(record.referenceNo || record.reference_no || record.ReferenceNo);
    return isTimestampFormat(ref);
  });

  if (timestampFormatIgps.length === 0) {
    console.log('No IGPs in timestamp format found.');
    return;
  }

  console.log(`Found ${timestampFormatIgps.length} IGPs in timestamp format.`);

  const existingSequentialRefs = records
    .map((r) => normalizeReference(r.referenceNo || r.reference_no || r.ReferenceNo))
    .filter((ref) => !isTimestampFormat(ref) && ref);

  for (const record of timestampFormatIgps) {
    const oldRef = normalizeReference(record.referenceNo || record.reference_no || record.ReferenceNo);
    const recordId = record.id ?? record.Id ?? record.igp_id ?? record.inward_gate_pass_id;
    const newRef = nextGatePassReferenceNo('IGP', existingSequentialRefs);
    console.log(`Converting id=${recordId}: ${oldRef} -> ${newRef}`);

    if (APPLY) {
      try {
        const minimal = { referenceNo: newRef };
        try {
          await updateIgp(recordId, minimal);
        } catch (err) {
          console.warn(`  minimal update failed for id=${recordId}: ${err.message || err}`);
          console.log('  trying full payload...');
          const payload = buildPayload(record, newRef);
          await updateIgp(recordId, payload);
        }
      } catch (err) {
        console.error(`  ERROR updating id=${recordId}: ${err.message || err}`);
        process.exit(1);
      }
    } else {
      console.log(`  (dry-run) would POST ${IGPS_UPDATE_URL}/${encodeURIComponent(recordId)} with payload`);
    }

    existingSequentialRefs.push(newRef);
  }

  console.log('\nFormat conversion complete. Please verify records in the backend.');
}

main().catch((error) => {
  console.error('Error:', error.message || error);
  process.exit(1);
});