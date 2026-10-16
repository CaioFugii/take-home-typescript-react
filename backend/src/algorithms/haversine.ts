const EARTH_RADIUS_KM = 6371

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

// Encontra a menor distancia entre dois pontos em uma esfera (Terra).
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const originLatitude = toRadians(lat1)
  const originLongitude = toRadians(lon1)
  const destinationLatitude = toRadians(lat2)
  const destinationLongitude = toRadians(lon2)

  const latitudeDistance = destinationLatitude - originLatitude
  const longitudeDistance = destinationLongitude - originLongitude

  const haversineOfLatitude = Math.sin(latitudeDistance / 2) ** 2
  const haversineOfLongitude = Math.sin(longitudeDistance / 2) ** 2
  const latitudeScale = Math.cos(originLatitude) * Math.cos(destinationLatitude)

  const haversine = haversineOfLatitude + latitudeScale * haversineOfLongitude
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))

  return EARTH_RADIUS_KM * centralAngle
}
