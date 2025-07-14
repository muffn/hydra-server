import Task from "./Task";
import { db } from "../db/db";
import { customers, redditAccounts } from "../db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "../utils/crypto";
import PushNotifications from "../services/PushNotifications";

type InboxItem = CommentReply | Message;

export type CommentReply = {
  id: string;
  name: string;
  type: "commentReply";
  author: string;
  new: boolean;
  postTitle: string;
  contextLink: string;
  subreddit: string;
  text: string;
};

export type Message = {
  id: string;
  name: string;
  type: "message";
  author: string;
  subject: string;
  new: boolean;
  text: string;
};

type CheckForMessagesData = {
  redditAccountId: number;
};

export default class CheckForMessages extends Task<
  "CheckForMessages",
  CheckForMessagesData
> {
  async handle(): Promise<void> {
    const redditAccount = db
      .select()
      .from(redditAccounts)
      .where(eq(redditAccounts.id, this.data.redditAccountId))
      .get();

    if (!redditAccount) {
      throw new Error(
        `Reddit account with ID ${this.data.redditAccountId} not found`,
      );
    }

    const session = JSON.parse(decrypt(redditAccount.session));

    const response = await fetch(
      "https://www.reddit.com/message/inbox.json?limit=10",
      {
        headers: {
          cookie: `${session.name}=${session.value}`,
        },
      },
    );

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    let inboxItems: InboxItem[] = ((await response.json()) as any).data.children
      .map((child: unknown) => this.formatInboxItem(child))
      .filter((item: InboxItem | undefined) => item !== undefined);

    const unreadCount = inboxItems.filter((item) => item.new).length;

    const lastSentItemIndex = inboxItems.findIndex(
      (item) => item.id === redditAccount.lastMessageId,
    );

    inboxItems = inboxItems
      .slice(0, lastSentItemIndex === -1 ? 100 : lastSentItemIndex)
      .filter((item) => item.new);

    if (inboxItems.length < 1) {
      await db
        .update(redditAccounts)
        .set({
          lastCheckedAt: new Date().toISOString(),
        })
        .where(eq(redditAccounts.id, redditAccount.id))
        .execute();
      return;
    }

    const customer = db
      .select()
      .from(customers)
      .where(eq(customers.customerId, redditAccount.customerId))
      .get();

    if (!customer?.pushToken) {
      throw new Error(
        `Push token not found for customer ${redditAccount.customerId}`,
      );
    }

    await Promise.all(
      inboxItems.map(async (item) => {
        if (!customer.pushToken) return;
        if (item.type === "commentReply") {
          this.sendCommentReplyNotification(
            customer.pushToken,
            item,
            unreadCount,
          );
        } else if (item.type === "message") {
          this.sendMessageNotification(customer.pushToken, item, unreadCount);
        }
      }),
    );

    const newestMessage = inboxItems[0];
    if (!newestMessage) return;

    await db
      .update(redditAccounts)
      .set({
        lastMessageId: newestMessage.id,
        lastCheckedAt: new Date().toISOString(),
      })
      .where(eq(redditAccounts.id, redditAccount.id))
      .execute();
  }

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatInboxItem(child: any): InboxItem | undefined {
    if (child.kind === "t1") {
      return {
        id: child.data.id,
        name: child.data.name,
        type: "commentReply",
        author: child.data.author,
        new: child.data.new,
        postTitle: child.data.link_title,
        contextLink: child.data.context,
        subreddit: child.data.subreddit,
        text: child.data.body,
      };
    } else if (child.kind === "t4") {
      return {
        id: child.data.id,
        name: child.data.name,
        type: "message",
        author: child.data.author,
        subject: child.data.subject,
        new: child.data.new,
        text: child.data.body,
      };
    }
  }

  sendCommentReplyNotification(
    pushToken: string,
    commentReply: CommentReply,
    unreadCount: number,
  ) {
    PushNotifications.send(
      pushToken,
      `${commentReply.author} in ${commentReply.postTitle}`,
      commentReply.text,
      unreadCount,
    );
  }

  sendMessageNotification(
    pushToken: string,
    message: Message,
    unreadCount: number,
  ) {
    PushNotifications.send(
      pushToken,
      `Message from ${message.author}`,
      message.text,
      unreadCount,
    );
  }
}
