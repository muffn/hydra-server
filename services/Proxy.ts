type ProxyResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProxyItem[];
};

type ProxyItem = {
  id: string;
  username: string;
  password: string;
  proxy_address: string;
  port: number;
  valid: boolean;
  last_verification: string;
  country_code: string;
  city_name: string;
  asn_name: string;
  asn_number: number;
  high_country_confidence: boolean;
  created_at: string;
};

const PROXY_UPDATE_INTERVAL = 1000 * 60 * 60 * 1; // 1 hour

export default class Proxy {
  private static proxies: string[] = [];
  private static lastUpdateAt: number = 0;

  static async getProxies() {
    if (
      this.proxies.length > 0 &&
      Date.now() - this.lastUpdateAt < PROXY_UPDATE_INTERVAL
    )
      return this.proxies;
    const response = await fetch(
      "https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page=1&page_size=100",
      {
        headers: {
          Authorization: `Token ${process.env.WEBSHARE_TOKEN}`,
        },
      },
    );
    const res = (await response.json()) as ProxyResponse;
    this.proxies = res.results.map(
      (proxy) =>
        `http://${proxy.username}:${proxy.password}@${proxy.proxy_address}:${proxy.port}`,
    );
    this.lastUpdateAt = Date.now();
    return this.proxies;
  }

  static async getProxy() {
    if (!process.env.WEBSHARE_TOKEN) return undefined;
    await this.getProxies();
    return this.proxies[Math.floor(Math.random() * this.proxies.length)];
  }

  static async fetch(...params: Parameters<typeof fetch>) {
    const [url, options] = params;
    return fetch(url, {
      ...options,
      proxy: await this.getProxy(),
    });
  }
}
