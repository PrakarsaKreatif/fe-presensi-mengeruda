<script>
    import { onMount, onDestroy } from 'svelte';
    import { goto } from '$app/navigation';
    import { sendPresensi, getTodayPresensi } from '$lib/api';
    import { MapPin, Clock, CheckCircle, AlertTriangle, Camera, Menu, X } from 'lucide-svelte';

    let isMobileMenuOpen = $state(false);

    let user = $state(null);
    let isLoading = $state(true); // Mulai dengan loading karena butuh fetch status
    let isSubmitting = $state(false);
    let statusMessage = $state(null);
    let statusType = $state('info'); // 'success', 'error', 'info'
    
    // Status Absen Harian
    let rawCheckInTime = $state(null);
    let rawCheckOutTime = $state(null);
    
    // Server Settings
    let checkInStartStr = $state('06:00');
    let checkOutStartStr = $state('16:00');
    let isWfh = $state(false);
    let officeRadius = $state(50);

    let currentTime = $state(new Date());
    let timer;

    // Computed status absensi harian (reset otomatis jika beda hari)
    let isSameDay = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getDate() === currentTime.getDate() &&
               d.getMonth() === currentTime.getMonth() &&
               d.getFullYear() === currentTime.getFullYear();
    };

    let hasCheckedIn = $derived(isSameDay(rawCheckInTime));
    let hasCheckedOut = $derived(hasCheckedIn && rawCheckOutTime !== null && isSameDay(rawCheckOutTime));
    let checkInTime = $derived(hasCheckedIn ? rawCheckInTime : null);
    let checkOutTime = $derived(hasCheckedOut ? rawCheckOutTime : null);

    let isTooEarlyIn = $derived.by(() => {
        const [h, m] = checkInStartStr.split(':').map(Number);
        const checkInStart = new Date(currentTime);
        checkInStart.setHours(h, m, 0, 0);
        return currentTime < checkInStart;
    });

    let isTooEarlyOut = $derived.by(() => {
        const [h, m] = checkOutStartStr.split(':').map(Number);
        const checkOutStart = new Date(currentTime);
        checkOutStart.setHours(h, m, 0, 0);
        return currentTime < checkOutStart;
    });

    let isTooLateIn = $derived.by(() => {
        const [h, m] = checkOutStartStr.split(':').map(Number);
        const checkOutStart = new Date(currentTime);
        checkOutStart.setHours(h, m, 0, 0);
        // Anggap waktu absen masuk ditutup jika sudah masuk jam pulang
        return currentTime >= checkOutStart; 
    });
    
    // Photo Capture (WebRTC)
    let videoElement = $state(null);
    let canvasElement = $state(null);
    let stream = $state(null);
    let isCameraOpen = $state(false);
    let selectedPhoto = $state(null);
    let photoPreview = $state(null);

    onMount(async () => {
        const token = localStorage.getItem('sso_token');
        if (!token) {
            window.location.href = 'http://localhost:5176';
            return;
        }

        try {
            user = JSON.parse(localStorage.getItem('sso_user'));
            
            // PROTEKSI HAK AKSES APLIKASI
            // Pastikan user memiliki akses ke aplikasi E-Presensi
            const userApps = user?.applications || [];
            if (!userApps.includes('E-Presensi') && !user.roles?.some(r => r.name === 'Super Admin')) {
                alert('Akses Ditolak: Aplikasi ini hanya diperuntukkan bagi Perangkat Desa.');
                localStorage.removeItem('sso_token');
                localStorage.removeItem('sso_user');
                window.location.href = 'http://localhost:5176';
                return;
            }
        } catch (e) {
            console.error("Gagal membaca user data", e);
        }

        timer = setInterval(() => {
            currentTime = new Date();
        }, 1000);
        
        await fetchTodayStatus();
    });

    onDestroy(() => {
        if (timer) clearInterval(timer);
        stopCamera();
        if (photoPreview) URL.revokeObjectURL(photoPreview);
    });

    async function fetchTodayStatus() {
        try {
            const res = await getTodayPresensi();
            if (res.status === 'success') {
                if (res.settings) {
                    checkInStartStr = res.settings.check_in_start;
                    checkOutStartStr = res.settings.check_out_start;
                    isWfh = res.settings.is_wfh === '1' || res.settings.is_wfh === true || res.settings.is_wfh === 'true';
                    officeRadius = res.settings.office_radius ? parseInt(res.settings.office_radius) : 50;
                }
                if (res.data) {
                    rawCheckInTime = res.data.check_in_time;
                    if (res.data.check_out_time) {
                        rawCheckOutTime = res.data.check_out_time;
                    }
                }
            }
        } catch (error) {
            console.error("Gagal mengambil status harian", error);
        } finally {
            isLoading = false;
        }
    }

    function logout() {
        localStorage.removeItem('sso_token');
        localStorage.removeItem('sso_user');
        window.location.href = 'http://localhost:5176';
    }

    // --- WEBRTC CAMERA LOGIC ---
    async function startCamera() {
        try {
            isCameraOpen = true;
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' }, 
                audio: false 
            });
            if (videoElement) {
                videoElement.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            statusMessage = "Gagal mengakses kamera. Pastikan Anda telah memberikan izin kamera.";
            statusType = 'error';
            isCameraOpen = false;
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        isCameraOpen = false;
    }

    function takeSnapshot() {
        if (!videoElement || !canvasElement) return;

        const context = canvasElement.getContext('2d');
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

        // Convert canvas to Blob (file)
        canvasElement.toBlob((blob) => {
            if (blob) {
                // Buat mock File object
                selectedPhoto = new File([blob], "selfie.jpg", { type: "image/jpeg" });
                if (photoPreview) URL.revokeObjectURL(photoPreview);
                photoPreview = URL.createObjectURL(blob);
                stopCamera(); // Tutup kamera setelah foto terambil
            }
        }, 'image/jpeg', 0.8);
    }

    function clearPhoto() {
        selectedPhoto = null;
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        photoPreview = null;
        startCamera(); // Buka kamera lagi jika foto dihapus
    }

    async function handlePresensi() {
        if (!selectedPhoto) {
            statusMessage = "Mohon ambil foto selfie sebagai bukti terlebih dahulu.";
            statusType = 'error';
            return;
        }

        isSubmitting = true;
        statusMessage = "Mengambil lokasi GPS Anda...";
        statusType = 'info';

        if (!navigator.geolocation) {
            statusMessage = "Geolocation tidak didukung oleh browser Anda.";
            statusType = 'error';
            isSubmitting = false;
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                statusMessage = "Mengirim data presensi...";
                
                try {
                    const response = await sendPresensi(latitude, longitude, selectedPhoto);
                    if (response.status === 'success') {
                        statusType = 'success';
                        statusMessage = response.message;
                        
                        // Perbarui status UI langsung
                        if (!hasCheckedIn) {
                            rawCheckInTime = response.data.check_in_time;
                        } else {
                            rawCheckOutTime = response.data.check_out_time;
                        }
                        
                        clearPhoto();
                    }
                } catch (error) {
                    statusType = 'error';
                    if (error.response && error.response.data && error.response.data.message) {
                        statusMessage = error.response.data.message;
                    } else {
                        statusMessage = "Terjadi kesalahan saat mengirim presensi.";
                    }
                } finally {
                    isSubmitting = false;
                }
            },
            (error) => {
                statusType = 'error';
                isSubmitting = false;
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        statusMessage = "Akses lokasi ditolak. Izinkan akses lokasi untuk melakukan presensi.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        statusMessage = "Informasi lokasi tidak tersedia (Sinyal GPS tidak ditemukan).";
                        break;
                    case error.TIMEOUT:
                        statusMessage = "Permintaan lokasi memakan waktu terlalu lama (Timeout).";
                        break;
                    default:
                        statusMessage = "Terjadi kesalahan yang tidak diketahui saat mengambil lokasi.";
                        break;
                }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }

    const timeString = $derived(currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const dateString = $derived(currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
</script>

<svelte:head>
    <title>E-Presensi - Desa Mengeruda</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 pb-12">
    <!-- Navbar -->
    <nav class="bg-[#1e3a8a] text-white shadow-md sticky top-0 z-50">
        <div class="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <MapPin class="w-6 h-6 text-orange-400" />
                <span class="font-bold text-lg tracking-wide">E-Presensi</span>
            </div>
            {#if user}
                <!-- Desktop View -->
                <div class="hidden md:flex items-center gap-4">
                    <div class="text-right">
                        <div class="text-sm font-semibold">{user.name}</div>
                        <div class="text-xs text-blue-200">{user.email}</div>
                    </div>
                    
                    <button onclick={() => goto('/presensi/riwayat')} class="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-colors text-sm font-semibold shadow-sm">
                        Riwayat
                    </button>
                    
                    {#if user.roles?.some(r => r.name === 'Super Admin' || r.permissions?.some(p => p.name === 'manage-presensi'))}
                        <button onclick={() => goto('/admin')} class="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 transition-colors text-sm font-semibold shadow-sm">
                            Admin
                        </button>
                    {/if}

                    <button onclick={logout} class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-semibold">
                        Logout
                    </button>
                </div>

                <!-- Mobile Hamburger Button -->
                <button 
                    class="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                    onclick={() => isMobileMenuOpen = !isMobileMenuOpen}
                >
                    {#if isMobileMenuOpen}
                        <X class="w-6 h-6" />
                    {:else}
                        <Menu class="w-6 h-6" />
                    {/if}
                </button>
            {/if}
        </div>
        
        <!-- Mobile Menu Dropdown -->
        {#if user && isMobileMenuOpen}
            <div class="md:hidden border-t border-blue-800 bg-[#1e3a8a] px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div class="pb-3 border-b border-blue-800">
                    <div class="text-sm font-semibold">{user.name}</div>
                    <div class="text-xs text-blue-200">{user.email}</div>
                </div>
                
                <div class="flex flex-col gap-2">
                    <button onclick={() => { isMobileMenuOpen = false; goto('/presensi/riwayat'); }} class="w-full px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-colors text-sm font-semibold shadow-sm flex items-center justify-center">
                        Riwayat
                    </button>
                    
                    {#if user.roles?.some(r => r.name === 'Super Admin' || r.permissions?.some(p => p.name === 'manage-presensi'))}
                        <button onclick={() => { isMobileMenuOpen = false; goto('/admin'); }} class="w-full px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 transition-colors text-sm font-semibold shadow-sm flex items-center justify-center">
                            Admin
                        </button>
                    {/if}

                    <button onclick={logout} class="w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-semibold flex items-center justify-center mt-2">
                        Logout
                    </button>
                </div>
            </div>
        {/if}
    </nav>

    <main class="max-w-4xl mx-auto px-4 mt-8">
        <!-- Live Clock Card -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center mb-6">
            <div class="inline-flex items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-full mb-4">
                <Clock class="w-8 h-8" />
            </div>
            <h2 class="text-slate-500 font-medium mb-2">{dateString}</h2>
            <div class="text-5xl md:text-6xl font-black text-slate-800 tracking-tight font-mono">
                {timeString}
            </div>
            <p class="text-sm text-slate-400 mt-4">Waktu server menggunakan zona WITA (Waktu Indonesia Tengah)</p>
        </div>

        <!-- Attendance Action Card -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="p-8 flex flex-col items-center">
                {#if isLoading}
                    <div class="py-12 flex flex-col items-center justify-center">
                        <svg class="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p class="text-slate-500 font-medium">Memuat data absensi...</p>
                    </div>
                {:else if hasCheckedOut}
                    <!-- Sudah Absen Masuk & Pulang -->
                    <div class="text-center animate-in zoom-in duration-300">
                        <div class="w-24 h-24 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <CheckCircle class="w-12 h-12" />
                        </div>
                        <h3 class="text-2xl font-bold text-slate-800 mb-2">Presensi Selesai</h3>
                        <p class="text-slate-600 mb-6">Anda telah menyelesaikan presensi masuk dan pulang untuk hari ini.</p>
                        
                        <div class="bg-slate-50 rounded-xl p-4 inline-block text-left w-full max-w-sm border border-slate-100 mb-6">
                            <div class="grid grid-cols-2 gap-y-3 text-sm">
                                <div class="text-slate-500">Waktu Masuk</div>
                                <div class="font-bold text-slate-800 text-right">{new Date(checkInTime).toLocaleTimeString('id-ID')}</div>
                                <div class="text-slate-500">Waktu Pulang</div>
                                <div class="font-bold text-slate-800 text-right">{new Date(checkOutTime).toLocaleTimeString('id-ID')}</div>
                            </div>
                        </div>
                    </div>
                {:else}
                    <!-- Belum Absen Masuk ATAU Sudah Masuk tapi Belum Pulang -->
                    <p class="text-center text-slate-600 mb-6 max-w-md">
                        {#if isWfh}
                            <span class="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold mb-2">Status: WFH (Bebas Lokasi)</span><br>
                            Sistem mengizinkan absensi dari lokasi mana saja saat ini.
                        {:else}
                            Pastikan Anda berada di area Kantor Desa Mengeruda (radius {officeRadius}m) dan telah mengaktifkan GPS.
                        {/if}
                        
                        {#if hasCheckedIn}
                            <br><br>Anda sudah absen masuk pada jam <span class="font-bold">{new Date(checkInTime).toLocaleTimeString('id-ID')}</span>. Silakan ambil foto dan absen pulang.
                        {/if}
                    </p>
                    
                    {#if !hasCheckedIn && isTooEarlyIn}
                        <!-- Belum Waktunya Masuk -->
                        <div class="mb-8 w-full max-w-sm text-center animate-in fade-in zoom-in duration-300">
                            <div class="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                                <Clock class="w-10 h-10" />
                            </div>
                            <h3 class="text-xl font-bold text-slate-800 mb-1">Presensi Masih Belum Dibuka</h3>
                            <p class="text-sm text-slate-500">Absen masuk baru akan dibuka pada pukul <span class="font-bold text-slate-700">{checkInStartStr}</span> WITA.</p>
                        </div>
                    {:else if !hasCheckedIn && isTooLateIn}
                        <!-- Terlambat Ekstrem (Sudah Jam Pulang) -->
                        <div class="mb-8 w-full max-w-sm text-center animate-in fade-in zoom-in duration-300">
                            <div class="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                                <Clock class="w-10 h-10" />
                            </div>
                            <h3 class="text-xl font-bold text-slate-800 mb-1">Presensi Masih Belum Dibuka</h3>
                            <p class="text-sm text-slate-500">Waktu presensi masuk untuk hari ini telah berakhir. Presensi akan dibuka kembali esok hari pukul <span class="font-bold text-slate-700">{checkInStartStr}</span> WITA.</p>
                        </div>
                    {:else if hasCheckedIn && isTooEarlyOut}
                        <!-- Belum Waktunya Pulang -->
                        <div class="mb-8 w-full max-w-sm text-center animate-in fade-in zoom-in duration-300">
                            <div class="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                                <Clock class="w-10 h-10" />
                            </div>
                            <h3 class="text-xl font-bold text-slate-800 mb-1">Belum Waktunya Pulang</h3>
                            <p class="text-sm text-slate-500">Absen pulang baru akan dibuka pada pukul <span class="font-bold text-slate-700">{checkOutStartStr}</span> WITA.</p>
                        </div>
                    {:else}
                        <!-- Area Foto Selfie (WebRTC) -->
                        <div class="mb-8 w-full max-w-sm">
                            <!-- Canvas tersembunyi untuk mengambil gambar -->
                            <canvas bind:this={canvasElement} class="hidden"></canvas>
                            
                            {#if photoPreview}
                                <div class="relative w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-md border-4 border-white ring-1 ring-slate-200">
                                    <img src={photoPreview} alt="Selfie" class="w-full h-full object-cover" />
                                    <button onclick={clearPhoto} class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 shadow hover:bg-red-600 transition" title="Ulangi Foto">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                            {:else if isCameraOpen}
                                <div class="relative w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-md border-4 border-white ring-1 ring-blue-400 bg-black">
                                    <video bind:this={videoElement} autoplay playsinline class="w-full h-full object-cover"></video>
                                    
                                    <!-- Tombol Jepret -->
                                    <div class="absolute bottom-6 left-0 right-0 flex justify-center">
                                        <button onclick={takeSnapshot} class="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center border-4 border-white hover:bg-white/50 transition shadow-lg">
                                            <div class="w-12 h-12 bg-white rounded-full"></div>
                                        </button>
                                    </div>

                                    <!-- Tombol Tutup Kamera -->
                                    <button onclick={stopCamera} class="absolute top-2 right-2 bg-black/50 text-white rounded-full p-2 shadow hover:bg-black/70 transition">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                            {:else}
                                <button onclick={startCamera} class="w-full aspect-[3/4] bg-slate-100 hover:bg-slate-200 transition-colors rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 gap-3 group">
                                    <div class="bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                        <Camera class="w-8 h-8 text-blue-500" />
                                    </div>
                                    <span class="font-medium">Buka Kamera Laptop/PC</span>
                                    <span class="text-xs text-slate-400 px-4 text-center">Tekan tombol ini untuk mengambil foto langsung dari Browser.</span>
                                </button>
                            {/if}
                        </div>

                        <!-- Tombol Presensi -->
                        <button 
                            onclick={handlePresensi}
                            disabled={isSubmitting || !selectedPhoto}
                            class="relative group"
                        >
                            <!-- Pulse effect -->
                            <div class="absolute -inset-1 {hasCheckedIn ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'} rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                            
                            <!-- Button -->
                            <div class="relative w-56 h-16 {hasCheckedIn ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-gradient-to-r from-emerald-500 to-teal-600'} rounded-2xl flex items-center justify-center gap-3 text-white shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-70 disabled:hover:scale-100 cursor-pointer px-6">
                                {#if isSubmitting}
                                    <svg class="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span class="font-bold tracking-wide">Memproses...</span>
                                {:else}
                                    <MapPin class="w-6 h-6" strokeWidth={2.5} />
                                    <span class="font-bold text-lg tracking-wide">{hasCheckedIn ? 'ABSEN PULANG' : 'ABSEN MASUK'}</span>
                                {/if}
                            </div>
                        </button>
                    {/if}
                {/if}

                <!-- Modal Info/Error -->
                {#if statusMessage && !isSubmitting}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div class="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200" onclick={() => statusMessage = null}>
                        <div class="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200" onclick={(e) => e.stopPropagation()}>
                            <div class={`p-6 flex flex-col items-center text-center ${statusType === 'error' ? 'bg-rose-50' : statusType === 'success' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                                {#if statusType === 'error'}
                                    <div class="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4 shadow-sm border border-rose-200">
                                        <AlertTriangle class="w-8 h-8" />
                                    </div>
                                    <h3 class="text-xl font-bold text-rose-700 mb-2">Terjadi Kesalahan</h3>
                                {:else if statusType === 'success'}
                                    <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm border border-emerald-200">
                                        <CheckCircle class="w-8 h-8" />
                                    </div>
                                    <h3 class="text-xl font-bold text-emerald-700 mb-2">Berhasil</h3>
                                {:else}
                                    <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-sm border border-blue-200">
                                        <AlertTriangle class="w-8 h-8" />
                                    </div>
                                    <h3 class="text-xl font-bold text-blue-700 mb-2">Informasi</h3>
                                {/if}
                                <p class="text-slate-600 font-medium leading-relaxed">{statusMessage}</p>
                            </div>
                            <div class="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
                                <button onclick={() => statusMessage = null} class="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition shadow-sm w-full">
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </main>
</div>
