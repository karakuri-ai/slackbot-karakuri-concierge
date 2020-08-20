import { App, LogLevel, BlockAction, BlockElementAction } from "@slack/bolt";
import axios from "axios";
import cron from "node-cron";
import ST from "stjs";

const { write, loadTemplate } = require("./gs");
const { notifyBirthday } = require("./job");

const PORT = process.env.PORT || 5000;

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG,
});

/**
 * 毎朝８時に誕生日を通知
 * TODO メッセージ送信先を直接チャンネル指定しないようにする
 */
cron.schedule("0 8 * * *", notifyBirthday(app));

/**
 * helloと入力した際に歓迎メッセージを送る（テスト用）
 */
app.message("hello", async ({ message, say }) => {
  await say({
    text: "xxx",
    ...ST.select({ user: message.user })
      .transformWith(await loadTemplate("selfIntroductionMessage"))
      .root(),
  });
});

/**
 * ユーザが入ってきたときに歓迎メッセージを送る。
 */
app.event("member_joined_channel", async ({ event, say }) => {
  // const userId = event.user;
  console.log(event);
  // const channelId = event.channel;
  await say({
    text: "xxx",
    ...ST.select({ user: event.user })
      .transformWith(await loadTemplate("selfIntroductionMessage"))
      .root(),
  });
});

/**
 * action_idが'button_click'のactionイベントを検知して実行
 * モーダルを開く
 * // text: "This content can't be displayed.",
 */
app.action<BlockAction<BlockElementAction>>(
  "button_click",
  async ({ ack, body, context, respond }) => {
    await ack();
    try {
      await app.client.views.open({
        token: context.botToken,
        trigger_id: body.trigger_id,
        view: {
          ...(await loadTemplate("selfIntroductionModal")),
          private_metadata: JSON.stringify({
            channel_id: body.channel?.id,
            response_url: body.response_url,
          }),
        },
      });
    } catch (error) {
      console.error(error);
    }
  }
);

/**
 * モーダル送信イベントを検知して実行
 * データをGoogleSpleadSheetに保存する
 * ありがとうメッセージを送信する
 * TODO モーダル送信後にモーダルを開くボタンを非表示にする
 * TODO メッセージ送信先を直接チャンネル指定しないようにする
 */
app.view("view", async ({ ack, body, view, context, client }) => {
  await ack();
  const { channel_id, response_url } = JSON.parse(view.private_metadata);
  const user = body.user.id;
  const name = view["state"]["values"]["input1"]["name"]["value"];
  const group =
    view["state"]["values"]["input2"]["group"]["selected_option"]["value"];
  const birthday =
    view["state"]["values"]["input3"]["birthday"]["selected_date"];
  const hobby = view["state"]["values"]["input4"]["hobby"]["value"];
  const food = view["state"]["values"]["input5"]["food"]["value"];
  const appeal = view["state"]["values"]["input6"]["appeal"]["value"];

  try {
    await write([
      user,
      name,
      group,
      birthday,
      hobby,
      food,
      appeal,
      channel_id,
      JSON.stringify(view),
      JSON.stringify(body.user),
      JSON.stringify(context),
    ]);

    await axios.post(
      response_url,
      {
        replace_original: "true",
        response_type: "in_channel",
        text: "フォームが送信されました。",
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    await app.client.chat.postMessage({
      token: context.botToken,
      channel: channel_id,
      text: "xxx",
      blocks: ST.select({ user: body.user.id })
        .transformWith(
          (await loadTemplate("selfIntroductionThankYouMessage")).blocks
        )
        .root(),
    });
  } catch (error) {
    console.error(error);
  }
});

(async () => {
  await app.start(PORT);
  console.log("⚡️ Bolt app is running!");
})();
