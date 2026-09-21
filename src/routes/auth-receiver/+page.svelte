<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import api from '$lib/api';

    onMount(async () => {
        // Ambil token dari URL query parameter ?token=...
        const token = $page.url.searchParams.get('token');
        
        if (token) {
            // Simpan ke localStorage
            localStorage.setItem('sso_token', token);
            
            try {
                // Fetch user data from backend using the new token to store locally
                const response = await api.get('/auth/me');
                if (response.data) {
                    const userData = response.data.data || response.data;
                    const userApps = userData.applications || [];
                    
                    if (!userApps.includes('E-Presensi') && !userData.roles?.some(r => r.name === 'Super Admin')) {
                        alert('Akses Ditolak: Aplikasi ini hanya diperuntukkan bagi Perangkat Desa.');
                        localStorage.removeItem('sso_token');
                        window.location.href = 'http://localhost:5176';
                        return;
                    }

                    localStorage.setItem('sso_user', JSON.stringify(userData));
                }
                // Redirect ke halaman presensi
                goto('/presensi');
            } catch (error) {
                console.error("Gagal verifikasi token lokal", error);
                // Redirect back to SSO login
                window.location.href = 'http://localhost:5176';
            }
        } else {
            // Jika tidak ada token, kembali ke halaman utama
            goto('/');
        }
    });
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
        <svg class="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-gray-600 font-medium animate-pulse">Mengautentikasi sesi Anda...</p>
    </div>
</div>
