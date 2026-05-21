import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert, Linking, Image } from 'react-native';
import API_BASE_URL from '../config/api';

const API = API_BASE_URL;
const C = {
    bg: '#F5F7FA', card: '#FFFFFF', header: '#1E3A5F', primary: '#4F46E5',
    accent: '#0EA5E9', success: '#059669', warning: '#D97706', danger: '#DC2626',
    text: '#1F2937', textSec: '#6B7280', textMuted: '#9CA3AF', border: '#E5E7EB',
    lightGreen: '#ECFDF5', lightRed: '#FEF2F2', lightYellow: '#FFFBEB',
};

export default function OpportunitiesScreen() {
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [showLatestOnly, setShowLatestOnly] = useState(false);
    const [cardLoading, setCardLoading] = useState<Record<string, string | null>>({});

    const fetchData = async (latestOnly?: boolean) => {
        setApiError(null);
        try { const url = (latestOnly ?? showLatestOnly) ? `${API}/opportunities?latest=true` : `${API}/opportunities`; const res = await fetch(url); if (!res.ok) throw new Error(`Backend returned ${res.status}`); setOpportunities(await res.json()); }
        catch (e: any) { setApiError(e.message); } finally { setLoading(false); setRefreshing(false); }
    };
    useEffect(() => { fetchData(); }, []);
    const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [showLatestOnly]);

    const handleNotify = async (id: string) => {
        setCardLoading(prev => ({ ...prev, [id]: 'notify' }));
        try { const res = await fetch(`${API}/notifications/send/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channels: ['telegram', 'email', 'whatsapp_mock'] }) }); const data = await res.json(); if (res.ok) { Alert.alert('✅ Sent', Array.isArray(data) ? data.map((r: any) => `${r.channel}: ${r.status}`).join('\n') : 'Done'); } else Alert.alert('Error', data.error || 'Failed'); }
        catch (e: any) { Alert.alert('Error', e.message); } finally { setCardLoading(prev => ({ ...prev, [id]: null })); }
    };

    const handleWantToBuy = async (id: string, url: string) => {
        setCardLoading(prev => ({ ...prev, [id]: 'buy' }));
        try { const res = await fetch(`${API}/opportunities/${id}/want-to-buy`, { method: 'POST' }); if (res.ok) { const data = await res.json(); Alert.alert('✅ Approved', 'Opening product page...'); if (data.url || url) Linking.openURL(data.url || url); } else { const data = await res.json(); Alert.alert('Error', data.error || 'Failed'); } }
        catch (e: any) { Alert.alert('Error', e.message); } finally { setCardLoading(prev => ({ ...prev, [id]: null })); fetchData(); }
    };

    const handleDontWantToBuy = async (id: string) => {
        setCardLoading(prev => ({ ...prev, [id]: 'reject' }));
        try { const res = await fetch(`${API}/opportunities/${id}/dont-want-to-buy`, { method: 'POST' }); if (res.ok) Alert.alert('Rejected', 'Marked as not interested.'); else { const d = await res.json(); Alert.alert('Error', d.error); } }
        catch (e: any) { Alert.alert('Error', e.message); } finally { setCardLoading(prev => ({ ...prev, [id]: null })); fetchData(); }
    };

    if (loading) return (<View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={C.primary} /></View>);

    return (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}>
            <View style={styles.header}>
                <Text style={styles.headerLabel}>DISCOVERED</Text>
                <View style={styles.headerRow}>
                    <View><Text style={styles.headerTitle}>Opportunities</Text><Text style={styles.headerSub}>{showLatestOnly ? '📍 Latest run' : `${opportunities.length} total`}</Text></View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={[styles.filterBtn, showLatestOnly && styles.filterBtnActive]} onPress={() => { const n = !showLatestOnly; setShowLatestOnly(n); fetchData(n); }}><Text style={[styles.filterBtnText, showLatestOnly && { color: '#fff' }]}>{showLatestOnly ? '🔵 Latest' : 'Latest'}</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}><Text style={styles.refreshBtnText}>⟳</Text></TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.content}>
                {apiError && (<View style={styles.errorBanner}><Text style={styles.errorText}>⚠️ {apiError}</Text></View>)}
                {opportunities.length === 0 && (<View style={styles.emptyCard}><Text style={{ fontSize: 32 }}>🔍</Text><Text style={styles.emptyText}>No opportunities found</Text><Text style={styles.emptyHint}>Run an agent workflow to discover products</Text></View>)}

                {opportunities.map(op => {
                    const busy = !!cardLoading[op.id];
                    const sc = op.status === 'APPROVED' ? C.success : op.status === 'REJECTED' ? C.danger : C.warning;
                    const profit = (op.netProfit ?? 0) > 0;
                    return (
                        <View key={op.id} style={styles.card}>
                            <View style={styles.cardTop}>
                                {op.imageUrl ? <Image source={{ uri: op.imageUrl }} style={styles.productImg} /> : <View style={[styles.productImg, styles.imgPlaceholder]}><Text style={{ fontSize: 20 }}>📦</Text></View>}
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.cardTitle} numberOfLines={2}>{op.title}</Text>
                                    <Text style={styles.cardMeta}>{op.category} · {op.sourcePlatform}</Text>
                                </View>
                                <View style={[styles.badge, { backgroundColor: sc + '15' }]}><Text style={[styles.badgeText, { color: sc }]}>{op.status}</Text></View>
                            </View>
                            {op.matchScore > 0 && (<View style={styles.matchBar}><Text style={styles.matchText}>🎯 {(op.matchScore * 100).toFixed(0)}% match — {op.matchReason}</Text></View>)}
                            <View style={styles.priceRow}>
                                <View style={styles.priceBox}><Text style={styles.priceLabel}>Source</Text><Text style={styles.priceVal}>${op.sourcePrice?.toFixed(2)}</Text></View>
                                <Text style={{ color: C.textMuted, fontSize: 16, marginTop: 10 }}>→</Text>
                                <View style={styles.priceBox}><Text style={styles.priceLabel}>Resale</Text><Text style={[styles.priceVal, { color: C.accent }]}>${op.estimatedSellingPrice?.toFixed(2) || '—'}</Text></View>
                                <View style={styles.priceBox}><Text style={styles.priceLabel}>Profit</Text><Text style={[styles.priceVal, { color: profit ? C.success : C.danger }]}>{profit ? '+' : ''}${op.netProfit?.toFixed(2)}</Text></View>
                            </View>
                            <View style={styles.roiBar}>
                                <Text style={styles.roiText}>ROI: <Text style={{ color: C.success, fontWeight: '800' }}>{op.roiPercent?.toFixed(1)}%</Text></Text>
                                <Text style={styles.roiText}>Risk: <Text style={{ color: op.riskLevel === 'LOW' ? C.success : op.riskLevel === 'HIGH' ? C.danger : C.warning, fontWeight: '800' }}>{op.riskLevel}</Text></Text>
                            </View>
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.accent }]} onPress={() => handleNotify(op.id)} disabled={busy}>{cardLoading[op.id] === 'notify' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnText}>🔔 Notify</Text>}</TouchableOpacity>
                                {op.status !== 'REJECTED' && (<>
                                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.success }]} onPress={() => handleWantToBuy(op.id, op.sourceUrl)} disabled={busy}>{cardLoading[op.id] === 'buy' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnText}>✅ Buy</Text>}</TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.danger }]} onPress={() => handleDontWantToBuy(op.id)} disabled={busy}>{cardLoading[op.id] === 'reject' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnText}>❌ Skip</Text>}</TouchableOpacity>
                                </>)}
                            </View>
                        </View>
                    );
                })}
                <View style={{ height: 30 }} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    center: { justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: C.header, paddingHorizontal: 20, paddingTop: 58, paddingBottom: 22, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 },
    headerTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
    headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 },
    filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
    filterBtnActive: { backgroundColor: C.primary },
    filterBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
    refreshBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    refreshBtnText: { color: '#fff', fontSize: 16 },
    content: { padding: 16 },
    errorBanner: { backgroundColor: C.lightRed, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FECACA' },
    errorText: { color: C.danger, fontSize: 13, fontWeight: '600' },
    emptyCard: { backgroundColor: C.card, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    emptyText: { color: C.textSec, fontSize: 16, fontWeight: '600', marginTop: 8 },
    emptyHint: { color: C.textMuted, fontSize: 12, marginTop: 4 },
    card: { backgroundColor: C.card, borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
    productImg: { width: 48, height: 48, borderRadius: 12 },
    imgPlaceholder: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { color: C.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
    cardMeta: { color: C.textMuted, fontSize: 11, marginTop: 3 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    matchBar: { backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginTop: 12 },
    matchText: { color: C.textSec, fontSize: 11, fontStyle: 'italic' },
    priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, backgroundColor: C.bg, borderRadius: 14, padding: 12 },
    priceBox: { flex: 1, alignItems: 'center' },
    priceLabel: { color: C.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
    priceVal: { color: C.text, fontSize: 16, fontWeight: '800' },
    roiBar: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, backgroundColor: C.bg, borderRadius: 10, paddingVertical: 10 },
    roiText: { color: C.textSec, fontSize: 12, fontWeight: '600' },
    actionRow: { flexDirection: 'row', marginTop: 14, gap: 8 },
    actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});