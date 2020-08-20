import { google } from "googleapis";

const spreadsheetId = "xxx";

export async function auth() {
  return await google.auth.getClient({
    credentials: {
      client_email: process.env.GOOGLE_APPLICATION_CREDENTIALS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_APPLICATION_CREDENTIALS_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function loadIntroductions() {
  return await auth().then(async (auth) => {
    const data = await google
      .sheets({ version: "v4", auth })
      .spreadsheets.values.get({
        spreadsheetId,
        range: "シート1",
      });
    return (data.data.values || []).map((value) => {
      return {
        UserID: value[0],
        name: value[1],
        group: value[2],
        birthday: value[3],
        hobby: value[4],
        food: value[5],
        appeal: value[6],
      };
    });
  });
}

export async function write(array: string[]) {
  return await auth().then(async (auth) => {
    return await google
      .sheets({ version: "v4", auth })
      .spreadsheets.values.append({
        spreadsheetId,
        range: "シート1",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [array] },
      });
  });
}

export async function loadTemplate(templateId: string) {
  return await auth().then(async (auth) => {
    const templates = await google
      .sheets({ version: "v4", auth })
      .spreadsheets.values.get({
        spreadsheetId,
        range: "Template",
      });
    const template = (templates.data.values || []).find(
      (template) => template[0] === templateId
    );
    if (template) {
      return JSON.parse(template[1]);
    } else {
      return null;
    }
  });
}
