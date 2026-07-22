import sys
import json
import requests
from bs4 import BeautifulSoup
import subprocess
import re
from urllib.parse import urljoin, urlparse

def get_metadata(url):
    try:
        response = requests.get(url, timeout=15, headers={'User-Agent': 'OpenClaw-SEO-Bot/1.0'})
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Basic Meta
        title = soup.find('title').text if soup.find('title') else None
        description = soup.find('meta', attrs={'name': 'description'})
        description = description['content'] if description else None
        canonical = soup.find('link', attrs={'rel': 'canonical'})
        canonical = canonical['href'] if canonical else None
        lang = soup.find('html').get('lang') if soup.find('html') else None
        
        # Headers
        h1 = [h.text.strip() for h in soup.find_all('h1')]
        h2 = [h.text.strip() for h in soup.find_all('h2')]
        h3 = [h.text.strip() for h in soup.find_all('h3')]
        h4 = [h.text.strip() for h in soup.find_all('h4')]
        
        # Images
        images = soup.find_all('img')
        images_total = len(images)
        images_no_alt = len([img for img in images if not img.get('alt')])
        
        # Security/Mixed Content
        mixed_content = []
        if url.startswith('https'):
            for tag in soup.find_all(['img', 'script', 'link']):
                src = tag.get('src') or tag.get('href')
                if src and src.startswith('http://'):
                    mixed_content.append(src)

        return {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "metadata": {
                "title": title,
                "description": description,
                "canonical": canonical,
                "lang": lang,
                "h1": h1,
                "h2": h2,
                "h3": h3,
                "h4": h4
            },
            "images": {
                "total": images_total,
                "no_alt": images_no_alt
            },
            "mixed_content": mixed_content
        }
    except Exception as e:
        return {"error": str(e)}

def check_robots_sitemap(url):
    parsed = urlparse(url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"
    robots_url = urljoin(base_url, '/robots.txt')
    sitemap_url = urljoin(base_url, '/sitemap.xml')
    
    results = {}
    try:
        r = requests.get(robots_url, timeout=10)
        results['robots_txt'] = {"status": r.status_code, "exists": r.status_code == 200}
    except:
        results['robots_txt'] = {"exists": False}
        
    try:
        r = requests.get(sitemap_url, timeout=10)
        results['sitemap_xml'] = {"status": r.status_code, "exists": r.status_code == 200}
    except:
        results['sitemap_xml'] = {"exists": False}
        
    return results

def run_lighthouse(url):
    try:
        # Run lighthouse via npx in headless mode
        # Output to stdout as json
        cmd = [
            "npx", "lighthouse", url,
            "--output=json",
            "--chrome-flags=--headless --no-sandbox --disable-gpu",
            "--only-categories=performance,seo,best-practices"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            return {"error": "Lighthouse failed", "details": result.stderr}
        
        data = json.loads(result.stdout)
        
        return {
            "performance_score": data['categories']['performance']['score'] * 100,
            "seo_score": data['categories']['seo']['score'] * 100,
            "best_practices_score": data['categories']['best-practices']['score'] * 100,
            "metrics": {
                "fcp": data['audits']['first-contentful-paint']['displayValue'],
                "lcp": data['audits']['largest-contentful-paint']['displayValue'],
                "cls": data['audits']['cumulative-layout-shift']['displayValue'],
                "interactive": data['audits']['interactive']['displayValue']
            }
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No URL provided"}))
        sys.exit(1)
        
    target_url = sys.argv[1]
    
    report = {
        "url": target_url,
        "technical": get_metadata(target_url),
        "files": check_robots_sitemap(target_url),
        # Skipping lighthouse by default to keep it fast, unless requested
        # "lighthouse": run_lighthouse(target_url) 
    }
    
    # Check if --lighthouse flag is present
    if "--lighthouse" in sys.argv:
        report["lighthouse"] = run_lighthouse(target_url)
        
    print(json.dumps(report, indent=2, ensure_ascii=False))
