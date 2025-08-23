import Discord from "./Discord";

type ProxyResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProxyResponseItem[];
};

type ProxyResponseItem = {
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
const RETRY_BAD_PROXY_INTERVAL = 1000 * 60 * 30; // 30 minutes

export default class Proxy {
  private static proxies: string[] = [];
  private static badProxies: { [address: string]: number } = {};
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
    this.badProxies = {};
    this.lastUpdateAt = Date.now();
    return this.proxies;
  }

  static async getProxy() {
    if (!process.env.WEBSHARE_TOKEN) return undefined;
    await this.getProxies();
    this.restoreBadProxies();
    return this.proxies[Math.floor(Math.random() * this.proxies.length)];
  }

  static async handleBadProxy(proxy: string) {
    this.proxies = this.proxies.filter((p) => p !== proxy);
    this.badProxies[proxy] = Date.now();
  }

  static restoreBadProxies() {
    const goodProxiesLength = this.proxies.length;
    const badProxiesLength = Object.keys(this.badProxies).length;
    const totalProxiesLength = goodProxiesLength + badProxiesLength;
    console.log(`${badProxiesLength}/${totalProxiesLength} bad proxies`);
    if (badProxiesLength / totalProxiesLength < 0.1) {
      // If less than 10% of proxies are bad, don't bother restoring them
      return;
    }
    if (badProxiesLength / totalProxiesLength > 0.25) {
      // Notify
      Discord.sendMessageWithLimit(
        "proxy-bad",
        1000 * 60 * 60 * 1, // 1 hour
        `${((badProxiesLength / totalProxiesLength) * 100).toFixed(2)}% of proxies have gone bad.`,
      );
    }
    for (const [proxy, markedBadAt] of Object.entries(this.badProxies)) {
      if (Date.now() - markedBadAt > RETRY_BAD_PROXY_INTERVAL) {
        this.proxies.push(proxy);
        delete this.badProxies[proxy];
      }
    }
  }

  static async fetch(
    request: string | URL | Request,
    init?: BunFetchRequestInit,
  ) {
    const proxy = await this.getProxy();
    const response = await fetch(request, {
      ...init,
      proxy,
    });
    return {
      response,
      markProxyAsBad: () => (proxy ? this.handleBadProxy(proxy) : undefined),
    };
  }
}
