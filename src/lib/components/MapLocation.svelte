<script>
    import { onMount, onDestroy } from 'svelte';
    import 'leaflet/dist/leaflet.css';
    import 'leaflet-geosearch/dist/geosearch.css';

    let { lat = $bindable(), lng = $bindable(), radius = $bindable(), disabled = false } = $props();

    let mapElement;
    let map;
    let marker;
    let circle;

    // We only want to load Leaflet on the client side
    onMount(async () => {
        const L = (await import('leaflet')).default;

        // Leaflet custom icon fix
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        // Inisialisasi peta
        map = L.map(mapElement).setView([lat, lng], 16);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // Marker (Draggable)
        marker = L.marker([lat, lng], {
            draggable: !disabled
        }).addTo(map);

        // Lingkaran (Radius)
        circle = L.circle([lat, lng], {
            color: '#1e3a8a',
            fillColor: '#1e3a8a',
            fillOpacity: 0.2,
            radius: radius
        }).addTo(map);

        // Tambahkan fitur Search (Geosearch)
        import('leaflet-geosearch').then(({ GeoSearchControl, OpenStreetMapProvider }) => {
            const provider = new OpenStreetMapProvider();
            const searchControl = new GeoSearchControl({
                provider: provider,
                style: 'bar',
                showMarker: false, // Kita gunakan marker yang sudah ada
                showPopup: false,
                autoClose: true,
                retainZoomLevel: false,
                animateZoom: true,
                keepResult: true,
                searchLabel: 'Cari lokasi (cth: Kantor Desa Mengeruda)'
            });
            map.addControl(searchControl);

        // Event saat hasil pencarian dipilih
        map.on('geosearch/showlocation', function (result) {
            lat = parseFloat(result.location.y);
            lng = parseFloat(result.location.x);
            const newPos = [lat, lng];
            marker.setLatLng(newPos);
            circle.setLatLng(newPos);
        });
        });

        // Update circle secara real-time saat marker sedang digeser
        marker.on('drag', function (event) {
            circle.setLatLng(marker.getLatLng());
        });

        // Update state saat marker selesai digeser
        marker.on('dragend', function (event) {
            var position = marker.getLatLng();
            lat = position.lat;
            lng = position.lng;
            circle.setLatLng(position);
        });
    });

    // Watcher: jika disable state berubah, update map
    $effect(() => {
        if (marker && map) {
            if (disabled) {
                marker.dragging.disable();
                map.dragging.disable();
                map.touchZoom.disable();
                map.doubleClickZoom.disable();
                map.scrollWheelZoom.disable();
                circle.setStyle({ color: '#9ca3af', fillColor: '#9ca3af' });
            } else {
                marker.dragging.enable();
                map.dragging.enable();
                map.touchZoom.enable();
                map.doubleClickZoom.enable();
                map.scrollWheelZoom.enable();
                circle.setStyle({ color: '#1e3a8a', fillColor: '#1e3a8a' });
            }
        }
    });

    // Watcher: Update circle radius jika prop radius berubah
    $effect(() => {
        if (circle) {
            circle.setRadius(radius);
        }
    });

    // Watcher: jika lat/lng berubah dari parent
    $effect(() => {
        // Membaca lat dan lng agar Svelte mentrack dependensinya
        const _lat = parseFloat(lat);
        const _lng = parseFloat(lng);
        
        if (map && marker && circle && !isNaN(_lat) && !isNaN(_lng)) {
            const currentPos = marker.getLatLng();
            
            // Jika posisi marker saat ini berbeda dengan lat/lng dari props, update map
            if (currentPos.lat !== _lat || currentPos.lng !== _lng) {
                const newPos = [_lat, _lng];
                marker.setLatLng(newPos);
                circle.setLatLng(newPos);
                map.setView(newPos, map.getZoom(), { animate: false });
            }
        }
    });

    onDestroy(() => {
        if (map) {
            map.remove();
        }
    });
</script>

<div class="w-full h-[300px] rounded-xl overflow-hidden shadow-sm border border-slate-200 z-10" bind:this={mapElement}></div>
