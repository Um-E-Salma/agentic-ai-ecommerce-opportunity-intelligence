import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import API_BASE_URL from '../config/api';

const API = API_BASE_URL;
const C = {
    bg: '#F5F7FA', card: '#FFFFFF', header: '#1E3A5F', primary: '#4F46E5',
    accent: '#0EA5E9', success: '#059669', warning: '#D97706', danger: '#DC2626',
    text: '#1F2937', textSec: '#6B7280', textMuted: '#9CA3AF', border: '#E5E7EB',
    lightPurple: '#EEF2FF', lightBlue: '#F0F9FF', lightGreen: '#ECFDF5',
    lightYellow: '#FFFBEB', lightRed: '#FEF2F2', lightPink: '#FFF1F2',
};

export default function DashboardScreen() {
    const [data, setData] = useState<any>(null);
    const [strategy, setStrategy] = useState<any>(null);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [selectedWindow, setSelectedWindow] = useState<string>('7d');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [simulating, setSimulating] = useState<Record<string, boolean>>({});

    const fetchData = async () => {
        setApiError(null);
        try {
            const [dashRes, stratRes, campRes] = await Promise.all([fetch(`${API}/analytics/dashboard`), fetch(`${API}/analytics/strategy?window=${selectedWindow}`), fetch(`${API}/campaigns`)]);
            if (!dashRes.ok) throw new Error(`Backend returned ${dashRes.status}`);
            setData(await dashRes.json());
            if (stratRes.ok) setStrategy(await stratRes.json());
            if (campRes.ok) setCampaigns(await campRes.json());
        } catch (error: any) { setApiError(error.message); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchData(); }, [selectedWindow]);
    const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [selectedWindow]);

    const runStrategy = async () => {
        setAnalyzing(true);
        try { const res = await fetch(`${API}/analytics/run-strategy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ window: selectedWindow }) }); if (res.ok) { setStrategy(await res.json()); fetchData(); } }
        catch (e) { console.error(e); } finally { setAnalyzing(false); }
    };

    const generateCampaign = async () => {
        if (!strategy?.snapshot) return; setAnalyzing(true);
        try { const res = await fetch(`${API}/campaigns/draft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ snapshotId: strategy.snapshot.id, metricsContext: strategy.metrics, windowStr: selectedWindow }) }); if (res.ok) fetchData(); }
        catch (e) { console.error(e); } finally { setAnalyzing(false); }
    };

    const simulateCampaign = async (id: string) => {
        setSimulating(prev => ({ ...prev, [id]: true }));
        try { const res = await fetch(`${API}/campaigns/${id}/simulate`, { method: 'POST' }); if (res.ok) fetchData(); }
        catch (e) { console.error(e); } finally { setSimulating(prev => ({ ...prev, [id]: false })); }
    };

    if (loading) return (<View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={C.primary} /></View>);

    const s = data?.stats || {};

    return (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}>
            <StatusBar style="light" />
            <View style={styles.header}>
                <Text style={styles.headerLabel}>AGENTIC E-COMMERCE</Text>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Dashboard</Text>
                    <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}><Text style={styles.refreshBtnText}>⟳</Text></TouchableOpacity>
                </View>
            </View>

            <View style={styles.content}>
                {apiError && (<View style={styles.errorBanner}><Text style={styles.errorIcon}>⚠️</Text><Text style={styles.errorText}>{apiError}</Text></View>)}

                {/* KPI Row 1 */}
                <View style={styles.kpiRow}>
                    <View style={[styles.kpiCard, { backgroundColor: C.lightPurple }]}>
                        <Text style={styles.kpiEmoji}>📊</Text>
                        <Text style={[styles.kpiValue, { color: C.primary }]}>{s.totalInputs ?? 0}</Text>
                        <Text style={styles.kpiLabel}>Inputs</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: C.lightBlue }]}>
                        <Text style={styles.kpiEmoji}>🎯</Text>
                        <Text style={[styles.kpiValue, { color: C.accent }]}>{s.totalOpportunities ?? 0}</Text>
                        <Text style={styles.kpiLabel}>Opportunities</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: C.lightGreen }]}>
                        <Text style={styles.kpiEmoji}>🔔</Text>
                        <Text style={[styles.kpiValue, { color: C.success }]}>{s.totalNotificationsSent ?? 0}</Text>
                        <Text style={styles.kpiLabel}>Alerts</Text>
                    </View>
                </View>
                <View style={styles.kpiRow}>
                    <View style={[styles.kpiCard, { backgroundColor: C.lightYellow }]}>
                        <Text style={styles.kpiEmoji}>🛒</Text>
                        <Text style={[styles.kpiValue, { color: C.warning }]}>{s.totalCandidates ?? 0}</Text>
                        <Text style={styles.kpiLabel}>Candidates</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: C.lightGreen }]}>
                        <Text style={styles.kpiEmoji}>📦</Text>
                        <Text style={[styles.kpiValue, { color: C.success }]}>{s.purchased ?? 0}</Text>
                        <Text style={styles.kpiLabel}>Purchased</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: C.lightPink }]}>
                        <Text style={styles.kpiEmoji}>📋</Text>
                        <Text style={[styles.kpiValue, { color: '#E11D48' }]}>{s.totalListings ?? 0}</Text>
                        <Text style={styles.kpiLabel}>Listings</Text>
                    </View>
                </View>

                {/* Strategy */}
                <Text style={styles.sectionTitle}>AI Strategy</Text>
                <View style={styles.windowRow}>
                    {['24h', '7d', '30d'].map(w => (
                        <TouchableOpacity key={w} style={[styles.windowBtn, selectedWindow === w && styles.windowBtnActive]} onPress={() => setSelectedWindow(w)}>
                            <Text style={[styles.windowBtnText, selectedWindow === w && { color: '#fff' }]}>{w}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {strategy?.snapshot && (
                    <View style={styles.stratCard}>
                        <View style={styles.stratRow}>
                            <View><Text style={styles.stratLabel}>Health Score</Text><Text style={[styles.stratScore, { color: (strategy.metrics?.healthScore ?? 0) >= 70 ? C.success : (strategy.metrics?.healthScore ?? 0) >= 40 ? C.warning : C.danger }]}>{strategy.metrics?.healthScore ?? '—'}</Text></View>
                            <View style={{ alignItems: 'flex-end' }}><Text style={styles.stratLabel}>Confidence</Text><Text style={[styles.stratScore, { color: C.accent, fontSize: 22 }]}>{strategy.recommendation?.confidence ? `${(strategy.recommendation.confidence * 100).toFixed(0)}%` : '—'}</Text></View>
                        </View>
                        {strategy.recommendation?.reason && (<View style={styles.stratReason}><Text style={styles.stratReasonText}>🧠 {strategy.recommendation.reason}</Text></View>)}
                        {strategy.snapshot && !campaigns.some((c: any) => c.snapshotId === strategy.snapshot.id) && (
                            <TouchableOpacity style={styles.primaryBtn} onPress={generateCampaign} disabled={analyzing}><Text style={styles.primaryBtnText}>{analyzing ? 'Generating...' : '⚡ Generate Campaign'}</Text></TouchableOpacity>
                        )}
                    </View>
                )}
                {!strategy?.snapshot && (<TouchableOpacity style={styles.primaryBtn} onPress={runStrategy} disabled={analyzing}><Text style={styles.primaryBtnText}>{analyzing ? 'Analyzing...' : '🧠 Run Strategy Analysis'}</Text></TouchableOpacity>)}

                {/* Campaigns */}
                {campaigns.length > 0 && (<><Text style={styles.sectionTitle}>Campaigns</Text>
                    {campaigns.map(camp => {
                        const sc = camp.status === 'SIMULATED' ? C.success : camp.status === 'BLOCKED' ? C.danger : C.warning;
                        const gc = camp.safetyGateResult === 'PASSED' ? C.success : camp.safetyGateResult === 'MODIFIED' ? C.warning : C.danger;
                        return (<View key={camp.id} style={styles.campCard}>
                            <View style={styles.campHeader}><Text style={styles.campName} numberOfLines={1}>{camp.name}</Text><View style={[styles.badge, { backgroundColor: sc + '18' }]}><Text style={[styles.badgeText, { color: sc }]}>{camp.status}</Text></View></View>
                            <Text style={styles.campMeta}>{camp.campaignType} • {camp.channel} {camp.discountPercent ? `• ${camp.discountPercent}% OFF` : ''}</Text>
                            <View style={[styles.badge, { backgroundColor: gc + '18', alignSelf: 'flex-start', marginTop: 8 }]}><Text style={[styles.badgeText, { color: gc }]}>🛡 {camp.safetyGateResult}</Text></View>
                            {camp.status === 'DRAFT' && (<TouchableOpacity style={[styles.primaryBtn, { marginTop: 12, backgroundColor: C.warning }]} onPress={() => simulateCampaign(camp.id)} disabled={simulating[camp.id]}><Text style={styles.primaryBtnText}>{simulating[camp.id] ? 'Simulating...' : '▶ Simulate'}</Text></TouchableOpacity>)}
                            {camp.status === 'SIMULATED' && (<View style={styles.successBanner}><Text style={styles.successText}>✅ Simulation Complete</Text></View>)}
                        </View>);
                    })}
                </>)}

                {/* Recent Runs */}
                <Text style={styles.sectionTitle}>Recent Runs</Text>
                {(!data?.recentRuns || data.recentRuns.length === 0) && (<View style={styles.emptyCard}><Text style={{ fontSize: 28 }}>🤖</Text><Text style={styles.emptyText}>No agent runs yet</Text><Text style={styles.emptyHint}>Go to Input tab to start</Text></View>)}
                {data?.recentRuns?.map((run: any) => {
                    const rc = run.status === 'COMPLETED' ? C.success : run.status === 'FAILED' ? C.danger : C.warning;
                    return (<View key={run.id} style={styles.runCard}>
                        <View style={styles.runRow}><View style={[styles.runDot, { backgroundColor: rc }]} /><View style={{ flex: 1 }}><Text style={styles.runId}>Run {run.id.substring(0, 8)}…</Text><Text style={styles.runDate}>{new Date(run.startedAt).toLocaleString()}</Text></View>
                            <View style={[styles.badge, { backgroundColor: rc + '18' }]}><Text style={[styles.badgeText, { color: rc }]}>{run.status}</Text></View></View>
                        <Text style={styles.runSummary}>{run.traceLogs?.[0]?.outputSummary ? (() => { try { const p = JSON.parse(run.traceLogs[0].outputSummary); return `Found ${(p.summary?.strongCandidates ?? 0) + (p.summary?.reviewCandidates ?? 0)} candidate(s)`; } catch { return 'Run completed'; } })() : 'Processing…'}</Text>
                    </View>);
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
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    headerTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
    refreshBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    refreshBtnText: { color: '#fff', fontSize: 18 },
    content: { padding: 16 },
    errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.lightRed, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FECACA' },
    errorIcon: { fontSize: 16, marginRight: 10 },
    errorText: { color: C.danger, fontSize: 13, fontWeight: '600', flex: 1 },
    kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    kpiCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    kpiEmoji: { fontSize: 20, marginBottom: 6 },
    kpiValue: { fontSize: 24, fontWeight: '800' },
    kpiLabel: { color: C.textSec, fontSize: 10, fontWeight: '600', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 22, marginBottom: 12 },
    windowRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    windowBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
    windowBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    windowBtnText: { color: C.textSec, fontSize: 13, fontWeight: '700' },
    stratCard: { backgroundColor: C.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2, marginBottom: 14 },
    stratRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    stratLabel: { color: C.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    stratScore: { fontSize: 32, fontWeight: '800' },
    stratReason: { backgroundColor: C.bg, borderRadius: 12, padding: 12, marginBottom: 14 },
    stratReasonText: { color: C.textSec, fontSize: 13, lineHeight: 19 },
    primaryBtn: { backgroundColor: C.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
    primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    campCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
    campHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    campName: { color: C.text, fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
    campMeta: { color: C.textMuted, fontSize: 12 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    successBanner: { backgroundColor: C.lightGreen, borderRadius: 10, padding: 12, marginTop: 12 },
    successText: { color: C.success, fontSize: 13, fontWeight: '700' },
    emptyCard: { backgroundColor: C.card, borderRadius: 16, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    emptyText: { color: C.textSec, fontSize: 15, fontWeight: '600', marginTop: 8 },
    emptyHint: { color: C.textMuted, fontSize: 12, marginTop: 4 },
    runCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
    runRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    runDot: { width: 10, height: 10, borderRadius: 5 },
    runId: { color: C.text, fontSize: 14, fontWeight: '700' },
    runDate: { color: C.textMuted, fontSize: 11, marginTop: 2 },
    runSummary: { color: C.textSec, fontSize: 12, marginTop: 10, marginLeft: 20 },
});