import os
import sys
import json
import requests
import argparse
import time

# Пути
CREDENTIALS_DIR = os.path.expanduser("~/.openclaw/workspace/credentials")
METRIKA_TOKEN_PATH = os.path.join(CREDENTIALS_DIR, "yandex_metrika_token.txt")
XMLRIVER_KEY_PATH = os.path.join(CREDENTIALS_DIR, "xmlriver_key.txt")

def load_metrika_token():
    if os.path.exists(METRIKA_TOKEN_PATH):
        with open(METRIKA_TOKEN_PATH, 'r') as f:
            return f.read().strip()
    return os.environ.get("YANDEX_METRIKA_OAUTH_TOKEN")

def load_xmlriver_key():
    if os.path.exists(XMLRIVER_KEY_PATH):
        with open(XMLRIVER_KEY_PATH, 'r') as f:
            return f.read().strip()
    return os.environ.get("XMLRIVER_KEY")

def save_credential(path, value):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(value)
    print(f"Ключ/токен сохранен в {path}")

def call_metrika(endpoint, params=None, method='GET', max_retries=3):
    token = load_metrika_token()
    if not token:
        print("Ошибка: Токен Метрики не найден. Используйте 'auth metrika <TOKEN>'")
        sys.exit(1)
    
    headers = {"Authorization": f"OAuth {token}"}
    url = f"https://api-metrika.yandex.net{endpoint}"
    
    for attempt in range(max_retries):
        if method == 'GET':
            response = requests.get(url, headers=headers, params=params)
        else:
            response = requests.post(url, headers=headers, json=params)
            
        if response.status_code == 429:
            time.sleep(2 ** attempt) # Экспоненциальная задержка при 429
            continue
            
        if endpoint.endswith('.csv'):
            return response.text
        return response.json()
    
    return {"error": "Rate limit exceeded after retries", "status_code": 429}

def call_xmlriver_wordstat(query, region=0):
    key = load_xmlriver_key()
    if not key:
        print("Ошибка: Ключ XMLRiver не найден. Используйте 'auth xmlriver <KEY>'")
        sys.exit(1)
    
    # User ID из TOOLS.md (было 20930) - исправлено на 3528 на основе тестов
    user = "3528"
    url = "http://xmlriver.com/wordstat/new/json"
    params = {
        "user": user,
        "key": key,
        "query": query,
        "lr": region
    }
    
    response = requests.get(url, params=params)
    try:
        return json.dumps(response.json(), indent=2, ensure_ascii=False)
    except:
        return response.text

def main():
    parser = argparse.ArgumentParser(description="Analytics Assistant CLI (Metrika & XMLRiver)")
    subparsers = parser.add_subparsers(dest="command")
    
    # Auth
    auth_parser = subparsers.add_parser("auth")
    auth_parser.add_argument("service", choices=["metrika", "xmlriver"])
    auth_parser.add_argument("key")
    
    # Counters
    subparsers.add_parser("counters")
    
    # Wordstat (XMLRiver)
    ws_parser = subparsers.add_parser("wordstat")
    ws_parser.add_argument("query")
    ws_parser.add_argument("--region", type=int, default=0)
    
    # Stats
    stats_parser = subparsers.add_parser("stats")
    stats_parser.add_argument("type", choices=["traffic", "sources", "popular", "trend"])
    stats_parser.add_argument("--ids", required=True)
    stats_parser.add_argument("--date1", default="30daysAgo")
    stats_parser.add_argument("--date2", default="yesterday")
    stats_parser.add_argument("--robots", action="store_true", help="Включить данные роботов")
    stats_parser.add_argument("--csv", action="store_true", help="Выгрузить в формате CSV")
    stats_parser.add_argument("--limit", type=int, default=100)

    args = parser.parse_args()

    if args.command == "auth":
        path = METRIKA_TOKEN_PATH if args.service == "metrika" else XMLRIVER_KEY_PATH
        save_credential(path, args.key)
    elif args.command == "counters":
        data = call_metrika("/management/v1/counters")
        print(json.dumps(data, indent=2, ensure_ascii=False))
    elif args.command == "wordstat":
        data = call_xmlriver_wordstat(args.query, args.region)
        print(data)
    elif args.command == "stats":
        params = {
            "ids": args.ids,
            "date1": args.date1,
            "date2": args.date2,
            "limit": args.limit
        }
        
        # Автоматическая фильтрация роботов, если не указан флаг --robots
        is_pv = args.type == "popular"
        filter_prefix = "ym:pv:" if is_pv else "ym:s:"
        if not args.robots:
            params["filters"] = f"{filter_prefix}isRobot=='No'"
            
        endpoint = "/stat/v1/data"
        
        if args.type == "traffic":
            params["metrics"] = "ym:s:visits,ym:s:pageviews,ym:s:users,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDuration"
        elif args.type == "sources":
            params["dimensions"] = "ym:s:trafficSource"
            params["metrics"] = "ym:s:visits"
            params["sort"] = "-ym:s:visits"
        elif args.type == "popular":
            params["dimensions"] = "ym:pv:URL"
            params["metrics"] = "ym:pv:pageviews"
            params["sort"] = "-ym:pv:pageviews"
        elif args.type == "trend":
            endpoint = "/stat/v1/data/bytime"
            params["metrics"] = "ym:s:visits"
            params["group"] = "day"
            params["dimensions"] = "ym:s:date"

        if args.csv:
            endpoint += ".csv"
        
        data = call_metrika(endpoint, params=params)
        if isinstance(data, str):
            print(data)
        else:
            print(json.dumps(data, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
