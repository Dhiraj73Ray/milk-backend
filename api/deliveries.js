import { GoogleSpreadsheet } from "google-spreadsheet";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

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

export default async function handler(req, res) {
  // Always set CORS headers first
  res.setHeader("Access-Control-Allow-Origin", "*"); // or "*" for testing
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS preflight immediately
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const doc = new GoogleSpreadsheet(SHEET_ID);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    if (req.method === "POST") {
      const { user, address, milk, partner, quantity, date } = req.body;
      await sheet.addRow({ user, address, milk, partner, quantity, date });
      return res.status(200).json({ success: true, message: "Row added" });
    }

    if (req.method === "GET") {
      const rows = await sheet.getRows();
      const data = rows.map((r) => ({
        user: r.user,
        address: r.address,
        milk: r.milk,
        partner: r.partner,
        quantity: r.quantity,
        date: r.date,
      }));
      return res.status(200).json(data);
    }

    // NEW: PUT method to update specific row based on user name AND date
    if (req.method === "PUT") {
      const { user, address, milk, partner, quantity, date, targetDate } =
        req.body;

      // Get all rows
      const rows = await sheet.getRows();

      // Find the specific row to update based on user name AND date
      let rowToUpdate;

      if (targetDate) {
        // If targetDate is provided, find the specific entry by user + date
        rowToUpdate = rows.find(
          (row) => row.user === user && row.date === targetDate
        );
      } else {
        // If no targetDate, get all rows for the user and use the most recent
        const userRows = rows.filter((row) => row.user === user);
        if (userRows.length > 0) {
          // Sort by date to get the most recent (assuming date format is consistent)
          userRows.sort((a, b) => new Date(b.date) - new Date(a.date));
          rowToUpdate = userRows[0];
        }
      }

      if (!rowToUpdate) {
        return res.status(404).json({
          error: targetDate
            ? `No entry found for user "${user}" on date "${targetDate}"`
            : `No entries found for user "${user}"`,
        });
      }

      // Update the fields (only update provided values)
      if (address !== undefined) rowToUpdate.address = address;
      if (milk !== undefined) rowToUpdate.milk = milk;
      if (partner !== undefined) rowToUpdate.partner = partner;
      if (quantity !== undefined) rowToUpdate.quantity = quantity;
      if (date !== undefined) rowToUpdate.date = date;

      await rowToUpdate.save();

      return res.status(200).json({
        success: true,
        message: "Row updated successfully",
        updatedRow: {
          user: rowToUpdate.user,
          address: rowToUpdate.address,
          milk: rowToUpdate.milk,
          partner: rowToUpdate.partner,
          quantity: rowToUpdate.quantity,
          date: rowToUpdate.date,
        },
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// export default function handler(req, res) {
//   if (req.method === "GET") {
//     res.status(200).json({ message: "Hello from deliveries API!" });
//   } else {
//     res.status(405).json({ error: "Method not allowed" });
//   }
// }
