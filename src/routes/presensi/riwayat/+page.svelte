<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { getPresensiHistory } from '$lib/api';
    import { MapPin, ArrowLeft, Calendar, Clock, MapIcon } from 'lucide-svelte';

    let user = $state(null);
    let isLoading = $state(true);
    let attendances = $state([]);
    let errorMsg = $state('');

    let selectedMonth = $state(new Date().getMonth() + 1);
    let selectedYear = $state(new Date().getFullYear());

    const months = [
        { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
        { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
        { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
        { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
        { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
        { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
    ];

    const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - i);

    onMount(async () => {
        const token = localStorage.getItem('sso_token');
        if (!token) {
            window.location.href = 'http://localhost:5176';
            return;
        }

        try {
            user = JSON.parse(localStorage.getItem('sso_user'));
        } catch (e) {
            console.error("Gagal membaca user data", e);
        }

        await fetchHistory();
    });

    async function fetchHistory() {
        isLoading = true;
        errorMsg = '';
        try {
            const res = await getPresensiHistory(selectedMonth, selectedYear);
            if (res.status === 'success') {
                attendances = res.data;
            }
        } catch (error) {
            console.error("Gagal mengambil riwayat presensi", error);
            errorMsg = "Gagal memuat data riwayat presensi.";
        } finally {
            isLoading = false;
        }
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    function formatTime(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getPhotoUrl(path) {
        if (!path) return null;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8004/api';
        return `${apiUrl.replace('/api', '')}/storage/${path}`;
    }
</script>

<svelte:head>
    <title>Riwayat Presensi - E-Presensi</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 pb-12">
    <!-- Navbar -->
    <nav class="bg-[#1e3a8a] text-white shadow-md sticky top-0 z-50">
        <div class="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <button onclick={() => goto('/presensi')} class="p-2 hover:bg-white/10 rounded-full transition-colors mr-1">
                    <ArrowLeft class="w-5 h-5" />
                </button>
                <MapPin class="w-6 h-6 text-orange-400 hidden sm:block" />
                <span class="font-bold text-lg tracking-wide hidden sm:block">E-Presensi</span>
                <span class="font-semibold text-lg sm:hidden">Riwayat Saya</span>
            </div>
            
            {#if user}
                <div class="flex items-center gap-4">
                    <div class="text-right">
                        <div class="text-sm font-semibold">{user.name}</div>
                        <div class="text-xs text-blue-200">{user.email}</div>
                    </div>
                </div>
            {/if}
        </div>
    </nav>

    <main class="max-w-5xl mx-auto px-4 mt-8">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
                <h1 class="text-2xl font-bold text-slate-800 font-serif">Riwayat Presensi Saya</h1>
                <p class="text-slate-500 mt-1 text-sm">Lihat catatan kehadiran Anda berdasarkan bulan dan tahun.</p>
            </div>
            
            <div class="flex items-center gap-3 w-full sm:w-auto bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                <select 
                    bind:value={selectedMonth} 
                    onchange={fetchHistory}
                    class="bg-transparent border-none text-sm font-semibold text-slate-700 focus:ring-0 cursor-pointer"
                >
                    {#each months as month}
                        <option value={month.value}>{month.label}</option>
                    {/each}
                </select>
                <div class="w-px h-5 bg-slate-300"></div>
                <select 
                    bind:value={selectedYear} 
                    onchange={fetchHistory}
                    class="bg-transparent border-none text-sm font-semibold text-slate-700 focus:ring-0 cursor-pointer"
                >
                    {#each years as year}
                        <option value={year}>{year}</option>
                    {/each}
                </select>
            </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {#if isLoading}
                <div class="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                    <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                    <p>Memuat riwayat presensi...</p>
                </div>
            {:else if errorMsg}
                <div class="p-8 text-center text-red-500 bg-red-50">
                    {errorMsg}
                </div>
            {:else if attendances.length === 0}
                <div class="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                    <Calendar class="w-16 h-16 text-slate-300 mb-4" />
                    <p class="text-lg font-medium text-slate-700">Belum ada riwayat presensi</p>
                    <p class="text-sm">Tidak ada data kehadiran yang ditemukan untuk bulan ini.</p>
                </div>
            {:else}
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm text-slate-600">
                        <thead class="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-xs tracking-wider">
                            <tr>
                                <th class="px-6 py-4">Tanggal</th>
                                <th class="px-6 py-4">Masuk</th>
                                <th class="px-6 py-4">Keluar</th>
                                <th class="px-6 py-4">Lokasi (Lat, Lng)</th>
                                <th class="px-6 py-4 text-center">Foto Masuk</th>
                                <th class="px-6 py-4 text-center">Foto Keluar</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            {#each attendances as att}
                                <tr class="hover:bg-slate-50 transition-colors group">
                                    <td class="px-6 py-4 whitespace-nowrap font-medium text-slate-800">
                                        {formatDate(att.check_in_time)}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="flex items-center gap-2">
                                            <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                                            <span class="font-mono font-medium">{formatTime(att.check_in_time)}</span>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        {#if att.check_out_time}
                                            <div class="flex items-center gap-2">
                                                <div class="w-2 h-2 rounded-full bg-rose-500"></div>
                                                <span class="font-mono font-medium">{formatTime(att.check_out_time)}</span>
                                            </div>
                                        {:else}
                                            <span class="text-slate-400 italic text-xs">Belum Checkout</span>
                                        {/if}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">
                                        <div class="flex items-center gap-1">
                                            <MapIcon class="w-3 h-3" />
                                            {att.latitude}, {att.longitude}
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-center">
                                        {#if att.photo_path}
                                            <a href={getPhotoUrl(att.photo_path)} target="_blank" class="inline-block hover:opacity-80 transition-opacity">
                                                <img src={getPhotoUrl(att.photo_path)} alt="Foto Masuk" class="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-sm" />
                                            </a>
                                        {:else}
                                            <span class="text-slate-400">-</span>
                                        {/if}
                                    </td>
                                    <td class="px-6 py-4 text-center">
                                        {#if att.photo_out_path}
                                            <a href={getPhotoUrl(att.photo_out_path)} target="_blank" class="inline-block hover:opacity-80 transition-opacity">
                                                <img src={getPhotoUrl(att.photo_out_path)} alt="Foto Keluar" class="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-sm" />
                                            </a>
                                        {:else}
                                            <span class="text-slate-400">-</span>
                                        {/if}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    </main>
</div>
