<script>
    let { isSidebarOpen = $bindable(), pageTitle = "Dashboard", user = null } = $props();
</script>

<header class="h-[76px] bg-white border-b border-gray-200 flex items-center justify-between px-6 lg:px-10 shrink-0">
    <div class="flex items-center gap-4">
        <!-- Tombol Hamburger (HP) -->
        <button 
            class="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            onclick={() => isSidebarOpen = true}
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
        </button>
        <!-- Judul Dinamis -->
        <h1 class="text-xl font-bold text-[#1e3a8a]">{pageTitle}</h1>
    </div>

    <!-- Profil Admin -->
    <div class="flex items-center gap-3">
        <div class="text-right hidden sm:block">
            <div class="text-sm font-bold text-[#1e3a8a]">{user ? user.name : 'Admin'}</div>
            {#if user && user.email}
                <div class="text-xs text-slate-500">{user.email}</div>
            {/if}
        </div>
        <div class="w-10 h-10 bg-[#1e3a8a] rounded-full flex items-center justify-center text-white shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
            </svg>
        </div>
    </div>
</header>
