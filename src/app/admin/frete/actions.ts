"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "../../../lib/admin-auth";
import { geocodeShippingAddress } from "../../../shipping/geoapify";
import { hasOriginCoordinates, parseMoneyCents, ShippingError, validateShippingSettings, type ShippingSettings } from "../../../shipping/pricing";
import { getShippingSettings, reserveGeoapifyCredits, saveShippingSettings } from "../../../shipping/store";

export async function saveShippingSettingsAction(formData: FormData) {
  await requireAdminSession();
  const value = (name: string) => String(formData.get(name) ?? "").trim();
  const coordinate = (name: string) => value(name) === "" ? null : Number(value(name).replace(",", "."));
  const settings: ShippingSettings = {
    enabled: value("enabled") === "on", originStreet: value("originStreet"),
    originNumber: value("originNumber"), originNeighborhood: value("originNeighborhood"),
    originLatitude: coordinate("originLatitude"), originLongitude: coordinate("originLongitude"),
    minimumFeeCents: parseMoneyCents(value("minimumFee")), perKmCents: parseMoneyCents(value("perKm")),
    roundTrip: value("roundTrip") === "on",
  };
  let errorMessage = "";
  try {
    const previous = await getShippingSettings();
    const addressChanged = previous.originStreet !== settings.originStreet || previous.originNumber !== settings.originNumber
      || previous.originNeighborhood !== settings.originNeighborhood;
    if (addressChanged && settings.originLatitude === previous.originLatitude && settings.originLongitude === previous.originLongitude) {
      settings.originLatitude = null;
      settings.originLongitude = null;
    }
    validateShippingSettings(settings);
    if (settings.enabled) {
      if (!process.env.GEOAPIFY_API_KEY?.trim()) throw new ShippingError("configuration");
      if (!hasOriginCoordinates(settings)) {
        const point = await geocodeShippingAddress({ street: settings.originStreet, number: settings.originNumber, neighborhood: settings.originNeighborhood }, {
          apiKey: process.env.GEOAPIFY_API_KEY, reserveCredits: reserveGeoapifyCredits,
        });
        settings.originLatitude = point.lat;
        settings.originLongitude = point.lon;
      }
    }
    await saveShippingSettings(settings);
  } catch (error) {
    errorMessage = error instanceof ShippingError ? error.message
      : "Não foi possível salvar. Confira a conexão com o banco e execute a migração de entrega atualizada.";
  }
  if (errorMessage) redirect(`/admin/frete?error=${encodeURIComponent(errorMessage)}`);
  revalidatePath("/admin/frete");
  redirect("/admin/frete?success=1");
}
