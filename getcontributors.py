import os
import shutil
import requests
import json


REPO = "win12-online/win12"
PER_PAGE = 30
OUT_DIR = os.path.join(os.getcwd(), "static", "contributors")
API_URL = f"https://api.github.com/repos/{REPO}/contributors?per_page={PER_PAGE}"
TOKEN = os.environ.get("GITHUB_TOKEN")  # optional to avoid rate limits

def prepare_out_dir(path):
    if os.path.exists(path):
        shutil.rmtree(path)
    os.makedirs(path, exist_ok=True)

def fetch_contributors(url, headers):
    r = requests.get(url, headers=headers, timeout=15, verify=0)
    r.raise_for_status()
    return r.json()

def download_avatar(url, dest_path):
    r = requests.get(url, stream=True, timeout=15,verify=0)
    r.raise_for_status()
    with open(dest_path, "wb") as f:
        for chunk in r.iter_content(8192):
            if chunk:
                f.write(chunk)

def main():
    headers = {"Accept": "application/vnd.github.v3+json"}
    if TOKEN:
        headers["Authorization"] = f"token {TOKEN}"

    prepare_out_dir(OUT_DIR)

    contributors = fetch_contributors(API_URL, headers)[:PER_PAGE]

    mapping = []
    html_lines = []
    for i, c in enumerate(contributors, start=1):
        avatar_url = c.get("avatar_url")
        html_url = c.get("html_url") or f"https://github.com/{c.get('login')}"
        login = c.get("login", "")
        img_name = f"{i}.png"
        img_path = os.path.join(OUT_DIR, img_name)

        if avatar_url:
            try:
                download_avatar(avatar_url, img_path)
            except Exception:
                # skip failed download but continue
                open(img_path, "wb").close()

        mapping.append({"index": i, "login": login, "html_url": html_url, "img": img_name})
        html_lines.append(f'<div onclick="window.open(\'{html_url}\',\'_blank\')"><img src="static/contributors/{img_name}"></div>')

    # save mapping
    with open(os.path.join(OUT_DIR, "contributors.json"), "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)

    # output HTML
    print("\n".join(html_lines))

if __name__ == "__main__":
    main()