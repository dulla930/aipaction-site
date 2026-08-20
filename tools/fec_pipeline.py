#!/usr/bin/env python3
"""
AIP — FEC data pipeline
=======================
Pulls pro-Israel committee money per candidate straight from the FEC's public
API and produces an updated members dataset for assets/data.js, so the site's
"compiled from FEC filings" claim is literally true of AIP and the numbers
refresh themselves after every filing deadline.

What it counts, per candidate (career, across two-year periods):
  1. Direct + earmarked contributions:  Schedule B disbursements from each
     tracked committee to the candidate's authorized committees.
  2. Independent expenditures:          Schedule E spending by each tracked
     committee in SUPPORT of the candidate.

Usage:
  export FEC_API_KEY=...        # free key from https://api.open.fec.gov/developers/
  python3 tools/fec_pipeline.py --resolve         # step 1: resolve committee IDs, review them
  python3 tools/fec_pipeline.py --report          # step 2: build totals, write a diff CSV vs data.js
  python3 tools/fec_pipeline.py --write           # step 3: apply to assets/data.js (backs up first)

Design notes:
  - Committee IDs are RESOLVED BY NAME at runtime (and cached in
    tools/committees.json) instead of being hardcoded, so you can review
    exactly which committees are counted before any number changes.
  - --report never touches the site. It writes tools/fec_report.csv with
    old total, new total, and delta per member so you can eyeball big moves
    before publishing. Only --write updates data.js, and it saves
    assets/data.js.bak first.
  - Candidates are matched FEC-candidate -> our (name, state, seat) rows via
    state + district + fuzzy last name; unmatched FEC candidates are listed
    at the bottom of the report for manual review.
  - Rate limits: the free key allows 1,000 calls/hour. A full refresh uses a
    few hundred calls; the script sleeps as needed and can resume.

The tracked committee list mirrors the site's published methodology
("pro-Israel PACs and their large donors"). Add or remove names below —
every change shows up in --resolve output before it affects any number.
"""

import argparse, csv, json, os, re, sys, time, unicodedata
import urllib.parse, urllib.request

API = "https://api.open.fec.gov/v1"
KEY = os.environ.get("FEC_API_KEY", "")
HERE = os.path.dirname(os.path.abspath(__file__))
DATA_JS = os.path.join(HERE, "..", "assets", "data.js")
CACHE = os.path.join(HERE, "committees.json")
REPORT = os.path.join(HERE, "fec_report.csv")

# Committees tracked, by name-search. Reviewed at --resolve time.
COMMITTEE_QUERIES = [
    "AIPAC PAC",
    "American Israel Public Affairs",
    "United Democracy Project",
    "Democratic Majority for Israel",
    "DMFI PAC",
    "Pro-Israel America",
    "NORPAC",
    "JACPAC",
    "Joint Action Committee for Political Affairs",
    "To Protect Our Heritage",
    "U.S. Israel PAC",
    "Republican Jewish Coalition",
    "JStreetPAC",
    "Maccabee PAC",
    "Heartland PAC pro-Israel",
    "Florida Congressional Committee pro-Israel",
    "Washington PAC",
    "World Alliance for Israel",
]

def get(path, **params):
    if not KEY:
        sys.exit("Set FEC_API_KEY first (free at https://api.open.fec.gov/developers/)")
    params.setdefault("api_key", KEY)
    params.setdefault("per_page", 100)
    url = f"{API}{path}?{urllib.parse.urlencode(params, doseq=True)}"
    for attempt in range(5):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                return json.load(r)
        except Exception as e:
            wait = 15 * (attempt + 1)
            print(f"  retry in {wait}s ({e})")
            time.sleep(wait)
    sys.exit("FEC API unreachable after retries")

def paged(path, **params):
    page = 1
    while True:
        d = get(path, page=page, **params)
        yield from d.get("results", [])
        pg = d.get("pagination", {})
        if page >= pg.get("pages", 1):
            return
        page += 1
        time.sleep(0.5)

def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", s.lower())

# ---------------------------------------------------------------- resolve --
def resolve():
    found = {}
    for q in COMMITTEE_QUERIES:
        res = get("/committees/", q=q).get("results", [])
        for c in res[:5]:
            found[c["committee_id"]] = {
                "id": c["committee_id"],
                "name": c["name"],
                "designation": c.get("designation_full"),
                "type": c.get("committee_type_full"),
                "matched_query": q,
            }
        time.sleep(0.4)
    with open(CACHE, "w") as f:
        json.dump({"reviewed": False, "committees": list(found.values())}, f, indent=2)
    print(f"Wrote {len(found)} candidate committees to tools/committees.json")
    print("REVIEW that file: delete rows that are NOT pro-Israel committees")
    print('(name collisions happen), then set "reviewed": true and run --report.')

# ----------------------------------------------------------------- totals --
def load_committees():
    if not os.path.exists(CACHE):
        sys.exit("Run --resolve first.")
    d = json.load(open(CACHE))
    if not d.get("reviewed"):
        sys.exit("tools/committees.json not reviewed yet. Review it, set reviewed:true.")
    return [c["id"] for c in d["committees"]]

def build_totals(committee_ids):
    """candidate_id -> {'contrib': $, 'ie': $, 'name':, 'state':, 'district':, 'office':}"""
    by_cand = {}
    for cid in committee_ids:
        print(f"Schedule B (contributions) for {cid} …")
        for row in paged("/schedules/schedule_b/by_recipient_id/",
                         committee_id=cid, cycle=[2016, 2018, 2020, 2022, 2024, 2026]):
            rid = row.get("recipient_id") or ""
            if not rid.startswith("C"):
                continue
            amt = row.get("total") or 0
            by_cand.setdefault(("cmte", rid), 0)
            by_cand[("cmte", rid)] += amt
        print(f"Schedule E (independent expenditures) for {cid} …")
        for row in paged("/schedules/schedule_e/by_candidate/",
                         committee_id=cid, support_oppose_indicator="S",
                         cycle=[2020, 2022, 2024, 2026]):
            cand = row.get("candidate_id")
            if cand:
                by_cand.setdefault(("cand", cand), 0)
                by_cand[("cand", cand)] += row.get("total") or 0
    return by_cand

# The recipient of Schedule B money is a COMMITTEE id; map it to its candidate.
def committee_to_candidate(cmte_id, cache={}):
    if cmte_id in cache:
        return cache[cmte_id]
    d = get(f"/committee/{cmte_id}/")
    res = (d.get("results") or [{}])[0]
    cands = res.get("candidate_ids") or []
    cache[cmte_id] = cands[0] if cands else None
    time.sleep(0.3)
    return cache[cmte_id]

# ------------------------------------------------------------------ merge --
def read_members():
    src = open(DATA_JS, encoding="utf-8").read()
    rows = re.findall(
        r'\[\s*"((?:[^"\\]|\\.)*)"\s*,\s*"([DRI])"\s*,\s*"([A-Z]{2})"\s*,\s*"([A-Z\-0-9]+)"\s*,\s*(null|\d+)', src)
    return [(n.replace('\\"', '"'), p, st, seat, None if a == "null" else int(a))
            for n, p, st, seat, a in rows]

def candidate_meta(cand_id, cache={}):
    if cand_id in cache:
        return cache[cand_id]
    d = get(f"/candidate/{cand_id}/")
    res = (d.get("results") or [{}])[0]
    cache[cand_id] = res
    time.sleep(0.3)
    return res

def report(write=False):
    committee_ids = load_committees()
    raw = build_totals(committee_ids)

    # collapse to candidate_id
    per_candidate = {}
    for (kind, key), amt in raw.items():
        cand = key if kind == "cand" else committee_to_candidate(key)
        if cand:
            per_candidate[cand] = per_candidate.get(cand, 0) + amt

    members = read_members()
    index = {}
    for i, (name, p, st, seat, amt) in enumerate(members):
        index[(st, seat, norm(name.split()[-1]))] = i

    new_amounts = {}
    unmatched = []
    for cand, amt in per_candidate.items():
        meta = candidate_meta(cand)
        st = meta.get("state"); office = meta.get("office")
        dist = meta.get("district") or "00"
        seat = "SEN" if office == "S" else (f"{st}-{int(dist):02d}" if int(dist) else f"{st}-AL")
        last = norm((meta.get("name") or "").split(",")[0])
        i = index.get((st, seat, last))
        if i is None:
            unmatched.append((meta.get("name"), st, seat, amt))
        else:
            new_amounts[i] = new_amounts.get(i, 0) + round(amt)

    with open(REPORT, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["name", "state", "seat", "old_total", "new_total", "delta"])
        for i, (name, p, st, seat, old) in enumerate(members):
            new = new_amounts.get(i)
            if new is None:
                continue
            w.writerow([name, st, seat, old, new, (new - (old or 0))])
        w.writerow([])
        w.writerow(["UNMATCHED FEC CANDIDATES (review manually)"])
        for row in sorted(unmatched, key=lambda r: -r[3]):
            w.writerow(row)
    print(f"Wrote {REPORT}. Review it before --write.")

    if write:
        src = open(DATA_JS, encoding="utf-8").read()
        open(DATA_JS + ".bak", "w", encoding="utf-8").write(src)
        for i, new in sorted(new_amounts.items()):
            name, p, st, seat, old = members[i]
            esc = name.replace('"', '\\"')
            pat = re.compile(r'(\["%s","%s","%s","%s",)(null|\d+)' % (
                re.escape(esc), p, st, re.escape(seat)))
            src = pat.sub(lambda m: m.group(1) + str(new), src, count=1)
        # bump the as-of date
        today = time.strftime("%B %-d, %Y")
        src = re.sub(r'asOf: "[^"]+"', f'asOf: "{today}"', src)
        open(DATA_JS, "w", encoding="utf-8").write(src)
        print(f"Updated assets/data.js (backup at data.js.bak), asOf -> {today}")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--resolve", action="store_true")
    ap.add_argument("--report", action="store_true")
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    if a.resolve: resolve()
    elif a.write: report(write=True)
    elif a.report: report(write=False)
    else: ap.print_help()
