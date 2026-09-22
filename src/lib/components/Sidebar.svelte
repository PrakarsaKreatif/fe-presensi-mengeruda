<script>
    import { MapPin, Settings } from 'lucide-svelte';
    import { goto } from '$app/navigation';
    
    let { activeMenu = $bindable(), isSidebarOpen = $bindable() } = $props();

    const menus = [
        { id: 'Attendances', name: 'Data Presensi', icon: MapPin },
        { id: 'Settings', name: 'Pengaturan', icon: Settings }
    ];

    const handleLogout = () => {
        localStorage.removeItem('sso_token');
        localStorage.removeItem('sso_user');
        window.location.href = (import.meta.env.VITE_PUBLIC_SSO_URL || 'http://localhost:5176');
    };
</script>

<!-- Overlay Hitam untuk HP -->
{#if isSidebarOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
        class="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onclick={() => isSidebarOpen = false}
    ></div>
{/if}

<!-- SIDEBAR -->
<aside class={`
    fixed lg:static inset-y-0 left-0 z-50
    w-[260px] bg-[#1e3a8a] flex flex-col text-white shadow-xl
    transform transition-transform duration-300 ease-in-out
    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
`}>
    <!-- Logo & Title -->
    <div class="flex items-center gap-3 px-6 py-8">
        <div class="w-12 h-12 bg-white rounded-xl p-2 flex items-center justify-center shrink-0 shadow-md border border-white/20">
            <MapPin class="w-8 h-8 text-orange-500" />
        </div>
        <div>
            <h2 class="font-bold text-[18px] leading-tight tracking-wide">E-Presensi</h2>
            <p class="text-[13px] text-blue-200 font-medium">Admin Panel</p>
        </div>
    </div>

    <!-- Menu Navigasi -->
    <nav class="flex-1 px-4 space-y-1.5 overflow-y-auto mt-2">
        {#each menus as menu}
            <button 
                class={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[15px] transition-all
                    ${activeMenu === menu.id 
                    ? 'bg-white text-[#1e3a8a] shadow-sm translate-x-1' 
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                    }
                `}
                onclick={() => {
                    activeMenu = menu.id;
                    isSidebarOpen = false;
                }}
            >
                <svelte:component this={menu.icon} class="w-5 h-5 shrink-0" />
                {menu.name}
            </button>
        {/each}
    </nav>

    <!-- Tombol Navigasi Ekstra -->
    <div class="p-4 mb-4 space-y-2">
        <button onclick={() => goto('/presensi')} class="flex items-center gap-3 px-4 py-3 w-full text-white hover:bg-white/10 rounded-xl font-bold text-[14px] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            Kembali ke Web
        </button>
        <button onclick={handleLogout} class="flex items-center gap-3 px-4 py-3 w-full text-white hover:bg-white/10 rounded-xl font-bold text-[14px] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 rotate-180">
                <path fill-rule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z" clip-rule="evenodd" />
            </svg>
            Logout
        </button>
    </div>
</aside>
