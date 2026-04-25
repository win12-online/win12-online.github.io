import os
import shutil
import requests
import json
import argparse
import sys

REPO = "win12-online/win12"
PER_PAGE = 30
DEFAULT_OUT_DIR = os.path.join(os.getcwd(), "static", "contributors")
API_URL = f"https://api.github.com/repos/{REPO}/contributors?per_page={PER_PAGE}"
TOKEN = os.environ.get("GITHUB_TOKEN")  # optional to avoid rate limits

def ensure_out_dir(path, clean=False):
    if clean and os.path.exists(path):
        shutil.rmtree(path)
    os.makedirs(path, exist_ok=True)

def fetch_contributors(url, headers):
    r = requests.get(url, headers=headers, timeout=15, verify=False)
    r.raise_for_status()
    return r.json()

def download_avatar(url, dest_path):
    r = requests.get(url, stream=True, timeout=15, verify=False)
    r.raise_for_status()
    with open(dest_path, "wb") as f:
        for chunk in r.iter_content(8192):
            if chunk:
                f.write(chunk)

def load_mapping(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_mapping(mapping, out_dir):
    with open(os.path.join(out_dir, "contributors.json"), "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)

def download_from_mapping(mapping, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    for item in mapping:
        avatar = item.get("avatar_url")
        img_name = item.get("img") or f"{item.get('index','')}.png"
        img_path = os.path.join(out_dir, img_name)
        if avatar:
            try:
                download_avatar(avatar, img_path)
            except Exception:
                open(img_path, "wb").close()

def html_from_mapping(mapping, rel_img_dir="static/contributors"):
    lines = []
    for item in mapping:
        img = item.get("img", "")
        html_url = item.get("html_url", f"https://github.com/{item.get('login','')}")
        login = item.get("login", "")
        lines.append(f'<div onclick="window.open(\'{html_url}\',\'_blank\')" title="{login}"><img src="{rel_img_dir}/{img}"></div>')
    return "\n".join(lines)

def build_and_save_from_api(out_dir):
    headers = {"Accept": "application/vnd.github.v3+json"}
    if TOKEN:
        headers["Authorization"] = f"token {TOKEN}"
    ensure_out_dir(out_dir, clean=True)
    contributors = fetch_contributors(API_URL, headers)[:PER_PAGE]
    mapping = []
    for i, c in enumerate(contributors, start=1):
        avatar_url = c.get("avatar_url")
        html_url = c.get("html_url") or f"https://github.com/{c.get('login')}"
        login = c.get("login", "")
        img_name = f"{i}.png"
        mapping.append({"index": i, "login": login, "html_url": html_url, "img": img_name, "avatar_url": avatar_url})
        # try downloading right away
        if avatar_url:
            try:
                download_avatar(avatar_url, os.path.join(out_dir, img_name))
            except Exception:
                open(os.path.join(out_dir, img_name), "wb").close()
    save_mapping(mapping, out_dir)
    print(html_from_mapping(mapping))

def main():
    p = argparse.ArgumentParser(description="Manage contributors: fetch, extract from JSON, download avatars.")
    p.add_argument("--from-json", "-j", help="path to saved contributors.json to extract data from")
    p.add_argument("--out-dir", "-o", default=DEFAULT_OUT_DIR, help="output directory for avatars and mapping")
    p.add_argument("--download-only", action="store_true", help="only download avatars from provided mapping.json")
    p.add_argument("--download", action="store_true", help="when extracting from json, also download avatars")
    args = p.parse_args()

    out_dir = args.out_dir

    if args.from_json:
        mapping = load_mapping(args.from_json)
        # don't wipe existing dir by default
        ensure_out_dir(out_dir, clean=False)
        if args.download_only or args.download:
            download_from_mapping(mapping, out_dir)
            print(f"Downloaded avatars to {out_dir}")
            return
        # just extract and print HTML (no downloads)
        print(html_from_mapping(mapping))
        return

    # default: fetch from GitHub, save mapping, download avatars and print HTML
    build_and_save_from_api(out_dir)

if __name__ == "__main__":
    main()