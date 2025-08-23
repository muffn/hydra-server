const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

class Discord {
  private static messageLastSentAt: { [key: string]: number } = {};

  static async sendMessage(message: string) {
    if (!DISCORD_WEBHOOK_URL) {
      console.warn(
        "DISCORD_WEBHOOK_URL is not set. You can set this environment variable to send alerts to a Discord channel.",
      );
      return;
    }
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: message }),
    });
  }

  static async sendMessageWithLimit(
    key: string,
    limit: number,
    message: string,
  ) {
    if (!this.messageLastSentAt[key]) {
      this.messageLastSentAt[key] = Date.now();
    }
    if (Date.now() - this.messageLastSentAt[key] < limit) {
      return;
    }
    this.messageLastSentAt[key] = Date.now();
    await this.sendMessage(message);
  }
}

export default Discord;
