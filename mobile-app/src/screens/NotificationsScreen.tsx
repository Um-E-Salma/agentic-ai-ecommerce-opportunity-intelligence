import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import API_BASE_URL from '../config/api';
const API = API_BASE_URL;
const C = { bg: '#F5F7FA', card: '#FFFFFF', header: '#1E3A5F', primary: '#4F46E5', accent: '#0EA5E9', success: '#059669', warning: '#D97706', danger: '#DC2626', text: '#1F2937', textSec: '#6B7280', textMuted: '#9CA3AF', border: '#E5E7EB', lightGreen: '#ECFDF5', lightRed: '#FEF2F2' };
const CH: Record<string, { icon: string; label: string; color: string }> = { telegram: { icon: '✈️', label: 'Telegram', color: '#0088CC' }, email: { icon: '📧', label: 'Email', color: '#EA4335' }, whatsapp_mock: { icon: '💬', label: 'WhatsApp', color: '#25D366' } };

export default function NotificationsScreen() {
    const [channelStatus, setChannelStatus] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [testingChannel, setTestingChannel] = useState<string | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);

    const fetchData = async () => { setApiError(null); try { const [s, h] = await Promise.all([fetch(`${API}/notifications/status`), fetch(`${API}/notifications`)]); if (!s.ok || !h.ok) throw new Error('Backend error'); setChannelStatus(await s.json()); setNotifications(await h.json()); } catch (e: any) { setApiError(e.message); } finally { setLoading(false); setRefreshing(false); } };
    useEffect(() => { fetchData(); }, []);
    const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

    const handleTest = async (channel: string) => { setTestingChannel(channel); try { const res = await fetch(`${API}/notifications/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel }) }); const r = await res.json(); Alert.alert(r.success ? '✅ Sent' : '❌ Failed', r.message || r.error || 'Check config'); fetchData(); } catch (e: any) { Alert.alert('Error', e.message); } finally { setTestingChannel(null); } };

    if (loading) return (<View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={C.primary} /></View>);

    return (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}>
            <View style={styles.header}><Text style={styles.headerLabel}>CHANNELS</Text><View style={styles.headerRow}><Text style={styles.headerTitle}>Notifications</Text><TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}><Text style={styles.refreshBtnText}>⟳</Text></TouchableOpacity></View></View>
            <View style={styles.content}>
                {apiError && (<View style={styles.errorBanner}><Text style={styles.errorText}>⚠️ {apiError}</Text></View>)}
                <Text style={styles.sectionTitle}>Channel Status</Text>
                {channelStatus && Object.entries(channelStatus).map(([ch, info]: [string, any]) => {
                    const cfg = CH[ch] || { icon: '📡', label: ch, color: C.primary }; const ok = info.configured || info.enabled;
                    return (<View key={ch} style={styles.channelCard}>
                        <View style={styles.channelRow}><Text style={{ fontSize: 22 }}>{cfg.icon}</Text><View style={{ flex: 1, marginLeft: 14 }}><Text style={styles.channelName}>{cfg.label}</Text><Text style={styles.channelMode}>{info.mode || (ok ? 'Configured' : 'Not configured')}</Text></View><View style={[styles.dot, { backgroundColor: ok ? C.success : C.danger }]} /></View>
                        <TouchableOpacity style={[styles.testBtn, { borderColor: cfg.color }]} onPress={() => handleTest(ch)} disabled={testingChannel === ch}>{testingChannel === ch ? <ActivityIndicator size="small" color={cfg.color} /> : <Text style={[styles.testBtnText, { color: cfg.color }]}>🧪 Test</Text>}</TouchableOpacity>
                    </View>);
                })}
                <Text style={styles.sectionTitle}>History</Text>
                {notifications.length === 0 && (<View style={styles.emptyCard}><Text style={{ fontSize: 28 }}>🔕</Text><Text style={styles.emptyText}>No notifications sent yet</Text></View>)}
                {notifications.map((n: any) => {
                    const cfg = CH[n.channel?.toLowerCase()] || { icon: '📡', label: n.channel, color: C.primary }; const ok = n.status === 'SENT' || n.status === 'MOCK_CREATED';
                    return (<View key={n.id} style={styles.historyCard}><View style={styles.historyRow}><Text style={{ fontSize: 18 }}>{cfg.icon}</Text><View style={{ flex: 1, marginLeft: 12 }}><Text style={styles.historyChannel}>{cfg.label}</Text><Text style={styles.historySub} numberOfLines={1}>{n.subject || 'Opportunity Alert'}</Text><Text style={styles.historyDate}>{new Date(n.createdAt).toLocaleString()}</Text></View><View style={[styles.badge, { backgroundColor: ok ? C.lightGreen : C.lightRed }]}><Text style={[styles.badgeText, { color: ok ? C.success : C.danger }]}>{n.status}</Text></View></View></View>);
                })}
                <View style={{ height: 30 }} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg }, center: { justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: C.header, paddingHorizontal: 20, paddingTop: 58, paddingBottom: 22, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    headerTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
    refreshBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    refreshBtnText: { color: '#fff', fontSize: 18 },
    content: { padding: 16 },
    errorBanner: { backgroundColor: C.lightRed, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FECACA' },
    errorText: { color: C.danger, fontSize: 13, fontWeight: '600' },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 20, marginBottom: 12 },
    channelCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
    channelRow: { flexDirection: 'row', alignItems: 'center' },
    channelName: { color: C.text, fontSize: 15, fontWeight: '700' },
    channelMode: { color: C.textMuted, fontSize: 11, marginTop: 2 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    testBtn: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, marginTop: 10 },
    testBtnText: { fontSize: 12, fontWeight: '700' },
    emptyCard: { backgroundColor: C.card, borderRadius: 16, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    emptyText: { color: C.textSec, fontSize: 14, fontWeight: '600', marginTop: 8 },
    historyCard: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
    historyRow: { flexDirection: 'row', alignItems: 'center' },
    historyChannel: { color: C.text, fontSize: 13, fontWeight: '700' },
    historySub: { color: C.textSec, fontSize: 12, marginTop: 2 },
    historyDate: { color: C.textMuted, fontSize: 10, marginTop: 3 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 10, fontWeight: '700' },
});