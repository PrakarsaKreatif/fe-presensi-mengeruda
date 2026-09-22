<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { getAdminAttendances, getSettings, updateSettings } from '$lib/api';
    import { MapPin, Users, Download, Calendar, ArrowLeft, Settings, X, Save } from 'lucide-svelte';

    import Sidebar from '$lib/components/Sidebar.svelte';
    import Topbar from '$lib/components/Topbar.svelte';
    import MapLocation from '$lib/components/MapLocation.svelte';

    let user = $state(null);
    let attendances = $state([]);
    let isLoading = $state(true);
    let errorMsg = $state('');

    // Settings Modal State
    let activeMenu = $state('Attendances'); // 'Attendances' | 'Settings'
    let isSidebarOpen = $state(false); // Mobile sidebar state
    let isSavingSettings = $state(false);
    let formSettings = $state({
        check_in_start: '06:00',
        check_in_limit: '08:00',
        check_out_start: '16:00',
        is_wfh: false,
        office_lat: -8.7183,
        office_lng: 121.1278,
        office_radius: 50
    });
    let settingsError = $state('');
    let settingsSuccess = $state('');

    // Default to today's date formatted as YYYY-MM-DD
    let filterDate = $state(new Date().toISOString().split('T')[0]);

    onMount(() => {
        const token = localStorage.getItem('sso_token');
        if (!token) {
            window.location.href = (import.meta.env.VITE_PUBLIC_SSO_URL || 'http://localhost:5176');
            return;
        }

        try {
            user = JSON.parse(localStorage.getItem('sso_user'));
        } catch (e) {
            console.error("Gagal membaca user data", e);
        }

        // Cek otorisasi lokal sebagai pengaman ekstra
        let isAuthorized = false;
        if (user && user.roles) {
            isAuthorized = user.roles.some(role => 
                role.name === 'Super Admin' || 
                (role.permissions && role.permissions.some(p => p.name === 'manage-presensi'))
            );
        }

        if (!isAuthorized) {
            goto('/presensi');
            return;
        }

        fetchData();
        loadSettings();
    });

    async function loadSettings() {
        try {
            const res = await getSettings();
            if (res.status === 'success') {
                formSettings = {
                    check_in_start: res.data.check_in_start || '06:00',
                    check_in_limit: res.data.check_in_limit || '08:00',
                    check_out_start: res.data.check_out_start || '16:00',
                    is_wfh: res.data.is_wfh === '1' || res.data.is_wfh === true || res.data.is_wfh === 'true',
                    office_lat: parseFloat(res.data.office_lat || -8.7183),
                    office_lng: parseFloat(res.data.office_lng || 121.1278),
                    office_radius: parseInt(res.data.office_radius || 50)
                };
            }
        } catch (e) {
            console.error("Gagal memuat pengaturan jam", e);
        }
    }

    async function saveSettings() {
        isSavingSettings = true;
        settingsError = '';
        settingsSuccess = '';
        try {
            const res = await updateSettings(formSettings);
            if (res.status === 'success') {
                settingsSuccess = res.message;
                setTimeout(() => {
                    isSettingsOpen = false;
                    settingsSuccess = '';
                }, 1500);
            }
        } catch (e) {
            settingsError = e.response?.data?.message || 'Gagal menyimpan pengaturan.';
        } finally {
            isSavingSettings = false;
        }
    }

    async function fetchData() {
        isLoading = true;
        errorMsg = '';
        try {
            const response = await getAdminAttendances(filterDate || 'all');
            if (response.status === 'success') {
                attendances = response.data;
            }
        } catch (err) {
            errorMsg = err.response?.data?.message || 'Gagal mengambil data presensi.';
        } finally {
            isLoading = false;
        }
    }

    // Fungsi untuk export ke CSV
    function exportToCSV() {
        if (attendances.length === 0) {
            alert('Tidak ada data untuk diekspor.');
            return;
        }

        const headers = ['No', 'Nama Lengkap', 'NIK', 'Tgl Masuk', 'Jam Masuk', 'Status Masuk', 'Menit Telat', 'Jam Pulang', 'Foto Masuk', 'Foto Pulang'];
        
        const rows = attendances.map((item, index) => {
            const checkInDate = new Date(item.check_in_time);
            const checkOutTime = item.check_out_time ? new Date(item.check_out_time).toLocaleTimeString('id-ID') : 'Belum Absen';
            const photoIn = item.photo_in_path ? `http://localhost:8004/storage/${item.photo_in_path}` : '';
            const photoOut = item.photo_out_path ? `http://localhost:8004/storage/${item.photo_out_path}` : '';
            const lateMins = item.late_duration || 0;

            return [
                index + 1,
                `"${item.user?.name || '-'}"`,
                `'${item.user?.nik || '-'}'`,
                checkInDate.toLocaleDateString('id-ID'),
                checkInDate.toLocaleTimeString('id-ID'),
                item.status,
                lateMins,
                checkOutTime,
                photoIn,
                photoOut
            ];
        });

        let csvContent = headers.join(',') + '\n' + rows.map(e => e.join(',')).join('\n');
        
        // Tambahkan BOM untuk excel
        const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `laporan_presensi_${filterDate || 'semua'}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
</script>

<svelte:head>
    <title>Admin - E-Presensi</title>
</svelte:head>

<div class="flex h-screen bg-slate-50 overflow-hidden">
    <!-- Komponen Sidebar -->
    <Sidebar bind:activeMenu bind:isSidebarOpen />

    <!-- AREA KONTEN UTAMA -->
    <div class="flex-1 flex flex-col min-w-0">
        
        <!-- Komponen Topbar -->
        <Topbar 
            bind:isSidebarOpen 
            pageTitle={activeMenu === 'Attendances' ? 'Data Presensi' : 'Pengaturan Jam'} 
            {user} 
        />

        <!-- KONTEN SCROLLABLE -->
        <main class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div class="max-w-7xl mx-auto flex flex-col gap-6">
            {#if errorMsg}
                <div class="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 font-medium">
                    {errorMsg}
                </div>
            {/if}

            {#if activeMenu === 'Attendances'}
                <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 class="text-3xl font-bold text-slate-800 tracking-tight">Data Presensi</h1>
                        <p class="text-slate-500 mt-1">Kelola dan pantau presensi berdasarkan lokasi.</p>
                    </div>
                    
                    <div class="flex flex-col sm:flex-row items-center gap-3">
                        <div class="relative w-full sm:w-auto">
                            <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Calendar class="w-4 h-4 text-slate-400" />
                            </div>
                            <input 
                                type="date" 
                                bind:value={filterDate}
                                onchange={fetchData}
                                class="w-full sm:w-auto pl-10 pr-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        
                        <button 
                            onclick={exportToCSV}
                            class="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                        >
                            <Download class="w-4 h-4" />
                            <span>Ekspor CSV</span>
                        </button>
                    </div>
                </div>

                <!-- Table Card -->
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                            <th class="py-4 px-6 font-semibold w-16">No</th>
                            <th class="py-4 px-6 font-semibold">Nama Lengkap</th>
                            <th class="py-4 px-6 font-semibold">Waktu Presensi</th>
                            <th class="py-4 px-6 font-semibold text-center">Status</th>
                            <th class="py-4 px-6 font-semibold text-center">Bukti Foto</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 text-slate-700">
                        {#if isLoading}
                            <tr>
                                <td colspan="5" class="py-12 text-center text-slate-500">
                                    <svg class="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Memuat data presensi...
                                </td>
                            </tr>
                        {:else if attendances.length === 0}
                            <tr>
                                <td colspan="5" class="py-12 text-center text-slate-500">
                                    <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <MapPin class="w-8 h-8 text-slate-400" />
                                    </div>
                                    <p class="font-medium text-lg text-slate-600">Tidak ada data presensi</p>
                                    <p class="text-sm mt-1">Belum ada yang melakukan presensi pada tanggal ini.</p>
                                </td>
                            </tr>
                        {:else}
                            {#each attendances as item, i}
                                <tr class="hover:bg-slate-50/50 transition-colors">
                                    <td class="py-4 px-6 text-slate-500 font-medium">{i + 1}</td>
                                    <td class="py-4 px-6">
                                        <div class="font-bold text-slate-800">{item.user?.name || 'User Terhapus'}</div>
                                        <div class="text-sm text-slate-500 mt-0.5">NIK: {item.user?.nik || '-'}</div>
                                    </td>
                                    <td class="py-4 px-6">
                                        <div class="text-sm font-semibold text-slate-700">{new Date(item.check_in_time).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                        <div class="text-xs text-slate-600 mt-1 flex flex-col gap-1">
                                            <span class="flex items-center gap-1">
                                                <span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span> 
                                                Masuk: {new Date(item.check_in_time).toLocaleTimeString('id-ID')}
                                            </span>
                                            <span class="flex items-center gap-1">
                                                <span class="inline-block w-2 h-2 rounded-full {item.check_out_time ? 'bg-orange-500' : 'bg-slate-300'}"></span> 
                                                Pulang: {item.check_out_time ? new Date(item.check_out_time).toLocaleTimeString('id-ID') : 'Belum Absen'}
                                            </span>
                                        </div>
                                    </td>
                                    <td class="py-4 px-6 text-center">
                                        {#if item.status === 'Tepat Waktu'}
                                            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                Tepat Waktu
                                            </span>
                                        {:else if item.status === 'Terlambat'}
                                            <div class="flex flex-col items-center gap-1">
                                                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                                    Terlambat
                                                </span>
                                                {#if item.late_duration}
                                                    <span class="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded shadow-sm border border-rose-100">
                                                        ({item.late_duration} Menit)
                                                    </span>
                                                {/if}
                                            </div>
                                        {:else}
                                            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                                                {item.status}
                                            </span>
                                        {/if}
                                    </td>
                                    <td class="py-4 px-6 text-center">
                                        <div class="flex items-center justify-center gap-2">
                                            {#if item.photo_in_path}
                                                <a href={'http://localhost:8004/storage/' + item.photo_in_path} target="_blank" class="block w-10 h-10 rounded-lg overflow-hidden border border-emerald-200 hover:ring-2 hover:ring-emerald-400 transition" title="Foto Masuk">
                                                    <img src={'http://localhost:8004/storage/' + item.photo_in_path} alt="Masuk" class="w-full h-full object-cover" />
                                                </a>
                                            {/if}
                                            {#if item.photo_out_path}
                                                <a href={'http://localhost:8004/storage/' + item.photo_out_path} target="_blank" class="block w-10 h-10 rounded-lg overflow-hidden border border-orange-200 hover:ring-2 hover:ring-orange-400 transition" title="Foto Pulang">
                                                    <img src={'http://localhost:8004/storage/' + item.photo_out_path} alt="Pulang" class="w-full h-full object-cover" />
                                                </a>
                                            {/if}
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>
                </div>
            {:else if activeMenu === 'Settings'}
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-slate-100">
                        <h2 class="font-bold text-lg text-slate-800">Pengaturan Presensi</h2>
                        <p class="text-slate-500 text-sm mt-1">Sesuaikan batas waktu operasional dan lokasi absensi.</p>
                    </div>
                    
                    <div class="p-6">
                        {#if settingsError}
                            <div class="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6 font-medium">
                                {settingsError}
                            </div>
                        {/if}
                        {#if settingsSuccess}
                            <div class="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 mb-6 font-medium">
                                {settingsSuccess}
                            </div>
                        {/if}

                        <div class="space-y-6 max-w-lg">
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Mulai Absen Masuk</label>
                                <input type="time" bind:value={formSettings.check_in_start} class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                <p class="text-xs text-slate-500 mt-1">Sistem akan menolak absen masuk sebelum jam ini.</p>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Batas Akhir Masuk Tepat Waktu</label>
                                <input type="time" bind:value={formSettings.check_in_limit} class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                <p class="text-xs text-slate-500 mt-1">Setelah jam ini, status presensi akan menjadi "Terlambat".</p>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Mulai Absen Pulang</label>
                                <input type="time" bind:value={formSettings.check_out_start} class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                <p class="text-xs text-slate-500 mt-1">Sistem akan menolak absen pulang sebelum jam ini.</p>
                            </div>

                            <div class="pt-6 border-t border-slate-100">
                                <h3 class="font-bold text-slate-800 mb-4">Pengaturan Lokasi Presensi</h3>
                                
                                <!-- Toggle WFH -->
                                <label class="flex items-center gap-3 cursor-pointer mb-6 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition">
                                    <div class="relative">
                                        <input type="checkbox" bind:checked={formSettings.is_wfh} class="sr-only peer">
                                        <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </div>
                                    <div>
                                        <div class="font-semibold text-slate-700">Aktifkan Absensi WFH (Bebas Jarak)</div>
                                        <div class="text-xs text-slate-500">Dapat melakukan absen dari mana saja tanpa dibatasi radius lokasi.</div>
                                    </div>
                                </label>

                                <!-- Peta dan Radius -->
                                <div class={`transition-opacity ${formSettings.is_wfh ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                    <div class="mb-4">
                                        <label class="block text-sm font-semibold text-slate-700 mb-1">Radius Lokasi Absen (Meter)</label>
                                        <input type="number" min="10" max="5000" bind:value={formSettings.office_radius} class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" disabled={formSettings.is_wfh} />
                                        <p class="text-xs text-slate-500 mt-1">Hanya perangkat yang berada dalam area radius biru yang dapat melakukan absensi.</p>
                                    </div>
                                    
                                    <div class="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-semibold text-slate-700 mb-1">Latitude</label>
                                            <input type="number" step="any" bind:value={formSettings.office_lat} class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm" disabled={formSettings.is_wfh} />
                                        </div>
                                        <div>
                                            <label class="block text-sm font-semibold text-slate-700 mb-1">Longitude</label>
                                            <input type="number" step="any" bind:value={formSettings.office_lng} class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm" disabled={formSettings.is_wfh} />
                                        </div>
                                    </div>
                                    
                                    <div class="mb-2 flex justify-between items-end">
                                        <label class="block text-sm font-semibold text-slate-700">Peta Pusat Kantor Desa</label>
                                    </div>
                                    <MapLocation 
                                        bind:lat={formSettings.office_lat} 
                                        bind:lng={formSettings.office_lng} 
                                        bind:radius={formSettings.office_radius}
                                        disabled={formSettings.is_wfh} 
                                    />
                                    <p class="text-xs text-slate-500 mt-2">Geser pin (marker) untuk menentukan titik pusat lokasi absensi kantor desa.</p>
                                </div>
                            </div>

                            <div class="pt-4 border-t border-slate-100 flex justify-end">
                                <button onclick={saveSettings} disabled={isSavingSettings} class="px-6 py-2.5 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg shadow-sm transition flex items-center gap-2">
                                    {#if isSavingSettings}
                                        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Menyimpan...
                                    {:else}
                                        <Save class="w-4 h-4" /> Simpan Pengaturan
                                    {/if}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
            </div>
        </main>
    </div>
</div>
