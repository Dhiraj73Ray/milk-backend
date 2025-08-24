import http from "http";
import { GoogleSpreadsheet } from "google-spreadsheet";
import dotenv from "dotenv";

dotenv.config();

const SHEET_ID = "1rtud3_U8HvvhBYOc6d--IM7Bo4lsYt4wMDVCN5pWzl4";

const creds = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
};

async function getSheet() {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  return doc.sheetsByIndex[0];
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/deliveries") {
    try {
      const sheet = await getSheet();
      const rows = await sheet.getRows();
      const data = rows.map(r => ({
        user: r.user,
        milk: r.milk,
        quantity: r.quantity,
        date: r.date,
      }));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  } else if (req.method === "POST" && req.url === "/deliveries") {
    let body = "";
    req.on("data", chunk => (body += chunk.toString()));
    req.on("end", async () => {
      try {
        const { user, milk, quantity, date } = JSON.parse(body);
        const sheet = await getSheet();
        await sheet.addRow({ user, milk, quantity, date });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, message: "Row added" }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
  }
});

server.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});
