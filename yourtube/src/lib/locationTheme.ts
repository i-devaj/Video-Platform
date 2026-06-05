export const SOUTH_INDIA_STATES = [
  'Tamil Nadu', 'Kerala', 'Karnataka',
  'Andhra Pradesh', 'Telangana'
];

export function isInSouthIndia(state: string): boolean {
  return SOUTH_INDIA_STATES.includes(state);
}

export async function getLocationAndApplyTheme(
  setTheme: (theme: string) => void
): Promise<void> {
  // 1. Get current hour in IST
  const istString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istString);
  const hour = istDate.getHours();

  // 2. Check if hour is between 10 (inclusive) and 12 (exclusive)
  const isTargetTime = hour >= 10 && hour < 12;

  if (!isTargetTime) {
    setTheme('dark');
    return;
  }

  // 3. Get geolocation and reverse-geocode to find state
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });

    const { latitude: lat, longitude: lon } = position.coords;

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
    );
    const data = await response.json();
    const state: string = data?.address?.state ?? '';

    // 4. If both conditions met → light, otherwise → dark
    if (isInSouthIndia(state)) {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  } catch {
    // Geolocation denied or fetch error → default dark
    setTheme('dark');
  }
}
