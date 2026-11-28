import re
import json
import subprocess
import sys
import time
import os

BASE = "https://vote.cec.gov.tw/2026-local/zh-TW"

# All counties with TPP candidates, plus all 直轄市 mayors
COUNTIES = {
    "63000": "臺北市",
    "64000": "高雄市",
    "65000": "新北市",
    "66000": "臺中市",
    "67000": "臺南市",
    "68000": "桃園市",
    "09020": "金門縣",
    "10002": "宜蘭縣",
    "10004": "新竹縣",
    "10005": "苗栗縣",
    "10007": "彰化縣",
    "10008": "南投縣",
    "10009": "雲林縣",
    "10010": "嘉義縣",
    "10013": "屏東縣",
    "10015": "花蓮縣",
    "10016": "澎湖縣",
    "10017": "基隆市",
    "10018": "新竹市",
    "10020": "嘉義市",
}


def fetch(url, retries=3):
    for attempt in range(retries):
        try:
            proc = subprocess.run(
                ["curl", "-sS", "-A", "Mozilla/5.0", "--max-time", "15", url],
                capture_output=True, text=True, timeout=20
            )
            if proc.returncode == 0 and proc.stdout.strip():
                return proc.stdout
        except subprocess.TimeoutExpired:
            pass
        if attempt < retries - 1:
            time.sleep(0.5)
    return None


def parse_candidates(html):
    if not html or "404 Not Found" in html:
        return None

    title_match = re.search(r'<b>(.*?)</b>', html)
    title = title_match.group(1).strip() if title_match else ""

    seats_match = re.search(r'應選人數:\s*(\d+)', html)
    seats = int(seats_match.group(1)) if seats_match else 0

    progress_match = re.search(r'已送投票所數/總投票所數:\s*([\d,]+)/([\d,]+)', html)
    reported = int(progress_match.group(1).replace(',', '')) if progress_match else 0
    total = int(progress_match.group(2).replace(',', '')) if progress_match else 0

    time_match = re.search(r'資料更新時間:.*?(\d+/\d+\s+\d+:\d+)', html)
    update_time = time_match.group(1).strip() if time_match else ""

    candidates = []
    rows = re.findall(r'<tr>\s*(.*?)\s*</tr>', html, re.DOTALL)
    for row in rows:
        cells = re.findall(r'<td[^>]*>\s*(.*?)\s*</td>', row, re.DOTALL)
        if len(cells) < 6:
            continue
        number_text = re.sub(r'<[^>]+>', '', cells[0]).strip()
        name = re.sub(r'<[^>]+>', '', cells[1]).strip()
        gender = re.sub(r'<[^>]+>', '', cells[2]).strip()
        votes_str = re.sub(r'<[^>]+>', '', cells[3]).strip().replace(',', '')
        pct_str = re.sub(r'<[^>]+>', '', cells[4]).strip()
        party = re.sub(r'<[^>]+>', '', cells[5]).strip()
        try:
            votes = int(votes_str)
            pct = float(pct_str) if pct_str else 0.0
        except ValueError:
            continue
        candidates.append({
            "number": int(number_text) if number_text.isdigit() else 0,
            "name": name,
            "gender": gender,
            "votes": votes,
            "percentage": pct,
            "party": party,
        })

    if not candidates:
        return None

    return {
        "title": title,
        "seats": seats,
        "reportedStations": reported,
        "totalStations": total,
        "updateTime": update_time,
        "candidates": candidates
    }


def make_url(prefix, c, y="00", d="000", v="000", b="0000"):
    code = f"{c}{y}{d}{v}{b}"
    return f"{BASE}/{prefix}/{code}.html"


def scrape_mayor(county_code, county_name):
    url = make_url("TC", county_code)
    html = fetch(url)
    result = parse_candidates(html)
    if result:
        result["countyCode"] = county_code
        result["countyName"] = county_name
    return result


def scrape_council(county_code, county_name):
    results = {}
    for d in range(1, 50):
        dist = f"{d:02d}"
        url = make_url("T1", county_code, y=dist)
        html = fetch(url)
        result = parse_candidates(html)
        if result is None:
            break
        result["district"] = f"第{d}選舉區"
        result["districtCode"] = dist
        result["countyCode"] = county_code
        result["countyName"] = county_name
        results[f"district_{d}"] = result
    return results


def main():
    output_dir = sys.argv[1] if len(sys.argv) > 1 else "."

    all_results = {
        "scrapeTime": time.strftime("%Y-%m-%d %H:%M:%S"),
        "mayors": {},
        "councils": {},
    }

    total_candidates = 0

    for county_code, county_name in sorted(COUNTIES.items()):
        print(f"\n=== {county_name} ({county_code}) ===", file=sys.stderr)

        # Mayor
        mayor = scrape_mayor(county_code, county_name)
        if mayor:
            all_results["mayors"][county_code] = mayor
            n = len(mayor["candidates"])
            total_candidates += n
            print(f"  Mayor: {n} candidates, {mayor['reportedStations']}/{mayor['totalStations']} stations", file=sys.stderr)

        # Council
        council = scrape_council(county_code, county_name)
        if council:
            all_results["councils"][county_code] = council
            for dk, dv in council.items():
                n = len(dv["candidates"])
                total_candidates += n
            print(f"  Council: {len(council)} districts, {sum(len(d['candidates']) for d in council.values())} candidates", file=sys.stderr)

    output_path = os.path.join(output_dir, "election_results.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)

    print(f"\n=== Summary ===", file=sys.stderr)
    print(f"Counties: {len(COUNTIES)}", file=sys.stderr)
    print(f"Mayors: {len(all_results['mayors'])}", file=sys.stderr)
    print(f"Council districts: {sum(len(c) for c in all_results['councils'].values())}", file=sys.stderr)
    print(f"Total candidates: {total_candidates}", file=sys.stderr)
    print(f"Output: {output_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
