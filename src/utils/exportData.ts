import { WatchlistMeta } from '@/store/useTrackingStore';

export function exportWatchlistJSON(
    watchlist: WatchlistMeta,
    items: any[],
    events: any[]
) {
    const data = {
        watchlist: {
            name: watchlist.name,
            description: watchlist.description,
            color: watchlist.color,
            exportedAt: new Date().toISOString(),
        },
        objects: items.map(i => ({
            objectId: i.object_id,
            name: i.object_name,
            type: i.object_type,
            notes: i.notes,
            addedAt: i.added_at,
        })),
        timeline: events.map(e => ({
            type: e.event_type,
            title: e.title,
            description: e.description,
            objectId: e.object_id,
            timestamp: e.event_timestamp,
        })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `watchlist-${watchlist.name.toLowerCase().replace(/\s+/g, '-')}.json`);
}

export function exportWatchlistCSV(items: any[]) {
    const header = 'Object ID,Name,Type,Notes,Added At';
    const rows = items.map(i =>
        [i.object_id, `"${i.object_name}"`, i.object_type, `"${i.notes || ''}"`, i.added_at].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, 'watchlist-export.csv');
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
