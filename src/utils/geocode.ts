export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=no`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NightlyVenueAdmin/1.0' },
    });
    const data = await res.json();
    if (!data?.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}
