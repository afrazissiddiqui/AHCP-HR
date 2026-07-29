import fetch from 'node-fetch';
import readline from 'readline';

const API_BASE = 'http://ahcp.hr:8084/ahcp/public/api';
const IGPS_LIST_URL = `${API_BASE}/inward-gate-pass-list`;
const IGPS_UPDATE_URL = `${API_BASE}/inward-gate-pass-update`; // /{id}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

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
  const res = await fetch(IGPS_LIST_URL, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Failed to fetch IGP list: ${res.status} ${res.statusText}`);
  }
  return res.json();
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
  const res = await fetch(`${IGPS_UPDATE_URL}/${encodeURIComponent(recordId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to update IGP ${recordId}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function normalizeReference(ref) {
  return (ref || '').trim();
}

async function main() {
  console.log('Fetching IGP records...');
  const response = await fetchIgpList();
  const records = extractItems(response);
  const byRef = new Map();

  for (const record of records) {
    const ref = normalizeReference(record.referenceNo || record.reference_no || record.ReferenceNo);
    if (!ref) continue;
    const items = byRef.get(ref) || [];
    items.push(record);
    byRef.set(ref, items);
  }

  const duplicates = [];
  for (const [ref, items] of byRef.entries()) {
    if (items.length > 1) {
      duplicates.push({ ref, items });
    }
  }

  if (duplicates.length === 0) {
    console.log('No duplicate IGP reference numbers found.');
    return;
  }

  console.log(`Found ${duplicates.length} duplicate reference groups.`);
  let allRecords = records.map((item) => ({
    id: item.id ?? item.Id ?? item.igp_id ?? item.inward_gate_pass_id,
    referenceNo: normalizeReference(item.referenceNo || item.reference_no || item.ReferenceNo),
  }));

  for (const group of duplicates) {
    console.log(`\nDuplicate reference: ${group.ref}`);
    group.items.forEach((item, index) => {
      const id = item.id ?? item.Id ?? item.igp_id ?? item.inward_gate_pass_id;
      console.log(`  [${index}] id=${id} ref=${normalizeReference(item.referenceNo || item.reference_no || item.ReferenceNo)}`);
    });

    const keep = group.items[0];
    const fixItems = group.items.slice(1);

    for (const item of fixItems) {
      const itemId = item.id ?? item.Id ?? item.igp_id ?? item.inward_gate_pass_id;
      const existingRefs = allRecords.map((r) => r.referenceNo);
      const newRef = nextGatePassReferenceNo('IGP', existingRefs);
      console.log(`  Renumbering id=${itemId} -> ${newRef}`);
      const payload = buildPayload(item, newRef);
      await updateIgp(itemId, payload);
      allRecords.push({ id: itemId, referenceNo: newRef });
    }
  }

  console.log('\nDuplicate fix complete. Please verify records in the backend.');
}

main().catch((error) => {
  console.error('Error:', error.message || error);
  process.exit(1);
});
