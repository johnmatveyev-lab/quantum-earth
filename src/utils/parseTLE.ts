export interface TLERecord {
    name: string;
    line1: string;
    line2: string;
    noradId: string;
    inclination: number;
    eccentricity: number;
    meanMotion: number;
    epochYear: number;
    epochDay: number;
}

export function parseTLE(raw: string): TLERecord[] {
    const lines = raw.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const records: TLERecord[] = [];

    let i = 0;
    while (i < lines.length) {
        // Three-line format: name, line1, line2
        if (i + 2 < lines.length && lines[i + 1].startsWith('1 ') && lines[i + 2].startsWith('2 ')) {
            const name = lines[i];
            const line1 = lines[i + 1];
            const line2 = lines[i + 2];
            records.push(parseTLELines(name, line1, line2));
            i += 3;
            continue;
        }

        // Two-line format (no name)
        if (lines[i].startsWith('1 ') && i + 1 < lines.length && lines[i + 1].startsWith('2 ')) {
            const line1 = lines[i];
            const line2 = lines[i + 1];
            const noradId = line1.substring(2, 7).trim();
            records.push(parseTLELines(`SAT-${noradId}`, line1, line2));
            i += 2;
            continue;
        }

        i++;
    }

    if (records.length === 0) {
        throw new Error('No valid Two-Line Element (TLE) records could be parsed. Ensure the file follows the standard 2-line or 3-line format.');
    }

    return records;
}

function parseTLELines(name: string, line1: string, line2: string): TLERecord {
    const noradId = line1.substring(2, 7).trim();
    const epochYear = parseInt(line1.substring(18, 20));
    const epochDay = parseFloat(line1.substring(20, 32));
    const inclination = parseFloat(line2.substring(8, 16));
    const eccentricity = parseFloat('0.' + line2.substring(26, 33).trim());
    const meanMotion = parseFloat(line2.substring(52, 63));

    return {
        name: name.trim(),
        line1,
        line2,
        noradId,
        inclination,
        eccentricity,
        meanMotion,
        epochYear: epochYear > 56 ? 1900 + epochYear : 2000 + epochYear,
        epochDay,
    };
}
