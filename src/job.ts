import { App } from "@slack/bolt";
import moment from "moment";
import ST from "stjs";
import { loadIntroductions, loadTemplate } from "./gs";

export function notifyBirthday(app: App) {
  return async function () {
    console.log("job start notifyBirthday");

    const introductions = await loadIntroductions();

    for (const value of introductions) {
      console.log(
        value["UserID"],
        value["birthday"],
        moment().format("YYYY-MM-DD")
      );
      if (value["birthday"] === moment().format("YYYY-MM-DD")) {
        try {
          await app.client.chat.postMessage({
            token: process.env.SLACK_BOT_TOKEN,
            channel: "#slackbot_hackathon_a",
            text: "xxx",
            blocks: ST.select({ user: value["UserID"] })
              .transformWith(
                (await loadTemplate("happyBirthdayMessage")).blocks
              )
              .root(),
          });
        } catch (error) {
          console.error(error);
        }
      }
    }
  };
}
