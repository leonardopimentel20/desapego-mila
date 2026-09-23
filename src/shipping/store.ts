import mysql from "mysql2/promise";
import { defaultShippingSettings, ShippingError, validateShippingSettings, type ShippingSettings } from "./pricing";

async function connect() {
  if (!process.env.DATABASE_URL) throw new ShippingError("configuration");
  return mysql.createConnection(process.env.DATABASE_URL);
}

export async function getShippingSettings(): Promise<ShippingSettings> {
  const defaults = {
    ...defaultShippingSettings,
    originStreet: process.env.DELIVERY_ORIGIN_STREET || "",
    originNumber: process.env.DELIVERY_ORIGIN_NUMBER || "",
    originNeighborhood: process.env.DELIVERY_ORIGIN_NEIGHBORHOOD || "",
  };
  const connection = await connect();
  try {
    const [rows] = await connection.execute<mysql.RowDataPacket[]>("SELECT * FROM delivery_settings WHERE id = 1 LIMIT 1");
    const row = rows[0];
    if (!row) return defaults;
    return {
      enabled: row.enabled === 1, originStreet: row.origin_street || defaults.originStreet, originNumber: row.origin_number || defaults.originNumber,
      originNeighborhood: row.origin_neighborhood || defaults.originNeighborhood, minimumFeeCents: row.minimum_fee_cents,
      originLatitude: row.origin_latitude === null ? null : Number(row.origin_latitude),
      originLongitude: row.origin_longitude === null ? null : Number(row.origin_longitude),
      perKmCents: row.per_km_cents, roundTrip: row.round_trip === 1,
    };
  } catch (error) {
    // Uma instalação ainda não migrada continua com a taxa fixa anterior.
    if ((error as { code?: string }).code === "ER_NO_SUCH_TABLE") return defaults;
    throw error;
  } finally {
    await connection.end();
  }
}

export async function saveShippingSettings(settings: ShippingSettings) {
  validateShippingSettings(settings);
  const connection = await connect();
  try {
    await connection.execute(
      `INSERT INTO delivery_settings
       (id, enabled, origin_street, origin_number, origin_neighborhood, minimum_fee_cents, per_km_cents, round_trip, origin_latitude, origin_longitude)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), origin_street = VALUES(origin_street),
       origin_number = VALUES(origin_number), origin_neighborhood = VALUES(origin_neighborhood),
       minimum_fee_cents = VALUES(minimum_fee_cents), per_km_cents = VALUES(per_km_cents),
       round_trip = VALUES(round_trip), origin_latitude = VALUES(origin_latitude),
       origin_longitude = VALUES(origin_longitude), updated_at = CURRENT_TIMESTAMP`,
      [settings.enabled ? 1 : 0, settings.originStreet, settings.originNumber, settings.originNeighborhood,
        settings.minimumFeeCents, settings.perKmCents, settings.roundTrip ? 1 : 0, settings.originLatitude, settings.originLongitude],
    );
  } finally {
    await connection.end();
  }
}

// Reserva créditos antes de consultar a API, inclusive em caso de falha.
// O bloqueio no banco também coordena processos do site e do bot.
export async function reserveGeoapifyCredits(credits: number) {
  if (!Number.isInteger(credits) || credits < 1 || credits > 4) throw new ShippingError("quota");
  const connection = await connect();
  const usageDay = new Date().toISOString().slice(0, 10);
  let delay = 0;
  try {
    await connection.beginTransaction();
    await connection.execute("INSERT IGNORE INTO delivery_api_usage (usage_day, credits, next_request_at) VALUES (?, 0, 0)", [usageDay]);
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT credits, next_request_at FROM delivery_api_usage WHERE usage_day = ? FOR UPDATE", [usageDay],
    );
    const row = rows[0];
    if (!row || Number(row.credits) + credits > 2400) throw new ShippingError("quota");
    const slot = Math.max(Date.now(), Number(row.next_request_at));
    delay = slot - Date.now();
    if (delay > 3000) throw new ShippingError("unavailable");
    await connection.execute(
      "UPDATE delivery_api_usage SET credits = credits + ?, next_request_at = ? WHERE usage_day = ?",
      [credits, slot + 350, usageDay],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
}
