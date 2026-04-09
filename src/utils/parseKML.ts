interface KMLPlacemark {
    name: string;
    description?: string;
    coordinates: [number, number, number][]; // [lng, lat, alt]
    type: 'point' | 'line' | 'polygon';
}

export function parseKML(xmlString: string): KMLPlacemark[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');

    if (doc.documentElement.nodeName === 'parsererror') {
        throw new Error('Invalid KML format: Unable to parse XML structure.');
    }

    const placemarks: KMLPlacemark[] = [];
    const pmNodes = doc.querySelectorAll('Placemark');
    pmNodes.forEach(pm => {
        const name = pm.querySelector('name')?.textContent || 'Unnamed';
        const description = pm.querySelector('description')?.textContent || undefined;

        // Point
        const point = pm.querySelector('Point coordinates');
        if (point) {
            const coords = parseCoords(point.textContent || '');
            if (coords.length > 0) {
                placemarks.push({ name, description, coordinates: coords, type: 'point' });
            }
        }

        // LineString
        const line = pm.querySelector('LineString coordinates');
        if (line) {
            const coords = parseCoords(line.textContent || '');
            if (coords.length > 0) {
                placemarks.push({ name, description, coordinates: coords, type: 'line' });
            }
        }

        // Polygon
        const polygon = pm.querySelector('Polygon outerBoundaryIs LinearRing coordinates');
        if (polygon) {
            const coords = parseCoords(polygon.textContent || '');
            if (coords.length > 0) {
                placemarks.push({ name, description, coordinates: coords, type: 'polygon' });
            }
        }
    });

    if (placemarks.length === 0) {
        throw new Error('No supported valid placemarks (Points, LineStrings, or Polygons) found in KML.');
    }

    return placemarks;
}

function parseCoords(raw: string): [number, number, number][] {
    return raw
        .trim()
        .split(/\s+/)
        .map(s => {
            const parts = s.split(',').map(Number);
            return [parts[0] || 0, parts[1] || 0, parts[2] || 0] as [number, number, number];
        })
        .filter(c => !isNaN(c[0]) && !isNaN(c[1]));
}
