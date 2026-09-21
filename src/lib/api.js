import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8004/api',
    withCredentials: true,
});

// Interceptor untuk menyisipkan token JWT
api.interceptors.request.use(config => {
    if (typeof localStorage !== 'undefined') {
        const token = localStorage.getItem('sso_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
    }
    return config;
});

// Interceptor untuk meredirect ke SSO jika token invalid (401)
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('sso_token');
                localStorage.removeItem('sso_user');
                const ssoUrl = import.meta.env.VITE_PUBLIC_SSO_URL || 'http://localhost:5176/';
                window.location.href = ssoUrl;
            }
        }
        return Promise.reject(error);
    }
);

export async function initCsrf() {}

// === AUTH & ACCOUNT API ===
export async function registerUser(formData) {
    await initCsrf();
    const response = await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
}

export async function loginUser(email, password, remember = false) {
    await initCsrf();
    const response = await api.post('/auth/login', { email, password, remember });
    return response.data;
}

export async function logoutUser() {
    await initCsrf();
    const response = await api.post('/auth/logout');
    return response.data;
}

export async function getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
}

// === WARGA API ===
export async function getTemplates() {
    const response = await api.get('/templates');
    return response.data;
}

export async function getTemplateById(id) {
    const response = await api.get(`/templates/${id}`);
    return response.data;
}

export async function submitLetterRequest(templateId, formData) {
    await initCsrf();
    const response = await api.post('/permohonan', {
        template_id: templateId,
        form_data: formData
    });
    return response.data;
}

export async function getMyRequests() {
    const response = await api.get('/permohonan/my');
    return response.data;
}

export async function sendPresensi(latitude, longitude, photoFile) {
    const formData = new FormData();
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('photo', photoFile);

    const response = await api.post('/presensi', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
}

export async function getTodayPresensi() {
    const response = await api.get('/presensi/today');
    return response.data;
}

export async function getPresensiHistory(month = null, year = null) {
    let url = '/presensi/history';
    if (month && year) {
        url += `?month=${month}&year=${year}`;
    }
    const response = await api.get(url);
    return response.data;
}

// === ADMIN API ===
export async function getAdminAttendances(date) {
    const response = await api.get('/admin/attendances', { params: { date } });
    return response.data;
}

export async function getSettings() {
    const response = await api.get('/admin/settings');
    return response.data;
}

export async function updateSettings(data) {
    const response = await api.put('/admin/settings', data);
    return response.data;
}

export async function getPendingUsers() {
    const response = await api.get('/admin/users/pending');
    return response.data;
}

export async function getAllUsers() {
    const response = await api.get('/admin/users/all');
    return response.data;
}

export async function approveUser(userId) {
    await initCsrf();
    const response = await api.post(`/admin/users/${userId}/approve`);
    return response.data;
}

export function getKtpUrl(userId) {
    return `${API_BASE}/admin/users/${userId}/ktp`;
}

export async function createTemplate(data) {
    const response = await api.post('/admin/templates', data);
    return response.data;
}

export async function updateTemplate(id, data) {
    const response = await api.put(`/admin/templates/${id}`, data);
    return response.data;
}

export async function deleteTemplate(id) {
    const response = await api.delete(`/admin/templates/${id}`);
    return response.data;
}

export async function getAdminLetterRequests(status = 'all') {
    const response = await api.get(`/admin/surat?status=${status}`);
    return response.data;
}

export async function approveLetterRequest(requestId) {
    await initCsrf();
    const response = await api.post(`/admin/surat/${requestId}/approve`);
    return response.data;
}

export async function rejectLetterRequest(requestId, reason) {
    await initCsrf();
    const response = await api.post(`/admin/surat/${requestId}/reject`, {
        rejection_reason: reason
    });
    return response.data;
}

export function getPdfDownloadUrl(requestId) {
    return `${API_BASE}/pdf/download/${requestId}`;
}

export default api;
