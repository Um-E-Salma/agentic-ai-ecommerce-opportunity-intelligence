import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import API_BASE_URL from '../config/api';
const API = API_BASE_URL;
const C = { bg: '#F5F7FA', card: '#FFFFFF', header: '#1E3A5F', primary: '#4F46E5', accent: '#0EA5E9', success: '#059669', warning: '#D97706', danger: '#DC2626', text: '#1F2937', textSec: '#6B7280', textMuted: '#9CA3AF', border: '#E5E7EB' };
const AC: Record<string, string> = { ResearchInsightAgent: '#3B82F6', PurchaseDecisionAgent: '#F59E0B', ResaleListingAgent: '#8B5CF6', AnalyticsCampaignAgent: '#14B8A6', AgentAutoActions: '#EC4899', NotificationService: '#0EA5E9', PurchaseApprovalFlow: '#A855F7' };

export default function AgentTraceScreen() {
    const [logs, setLogs] = useState<any[]>([]); const [runs, setRuns] = useState<any[]>([]); const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [apiError, setApiError] = useState<string | null>(null);

    const fetchData = async (runId?: string) => { setApiError(null); try { const rr = await fetch(`${API}/agent/runs`); if (!rr.ok) throw new Error(`Error ${rr.status}`); const rd = await rr.json(); setRuns(rd); const tid = runId ?? (rd[0]?.id ?? null); setSelectedRunId(tid); if (tid) { const tr = await fetch(`${API}/agent/trace/${tid}`); if (!tr.ok) throw new Error('Failed'); setLogs(await tr.json()); } else setLogs([]); } catch (e: any) { setApiError(e.message); } finally { setLoading(false); setRefreshing(false); } };
    useEffect(() => { fetchData(); }, []);
    const onRefresh = useCallback(() => { setRefreshing(true); fetchData(selectedRunId || undefined); }, [selectedRunId]);

    if (loading) return (<View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={C.primary} /></View>);

    return (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}>
            <View style={styles.header}><Text style={styles.headerLabel}>AGENT LOGS</Text><View style={styles.headerRow}><Text style={styles.headerTitle}>Trace View</Text><TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}><Text style={styles.refreshBtnText}>⟳</Text></TouchableOpacity></View></View>
            <View style={styles.content}>
                {apiError && (<View style={styles.errorBanner}><Text style={styles.errorText}>⚠️ {apiError}</Text></View>)}
                <Text style={styles.sectionTitle}>Select Run</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                    {runs.map(run => {
                        const active = run.id === selectedRunId; const sc = run.status === 'COMPLETED' ? C.success : run.status === 'FAILED' ? C.danger : C.warning;
                        return (<TouchableOpacity key={run.id} style={[styles.runChip, active && styles.runChipActive]} onPress={() => { setSelectedRunId(run.id); fetchData(run.id); }}>
                            <View style={[styles.chipDot, { backgroundColor: sc }]} /><Text style={[styles.runChipText, active && { color: '#fff' }]}>{run.id.substring(0, 6)}…</Text></TouchableOpacity>);
                    })}
                </ScrollView>
                <Text style={styles.sectionTitle}>Execution Timeline</Text>
                {logs.length === 0 && (<View style={styles.emptyCard}><Text style={{ fontSize: 28 }}>📭</Text><Text style={styles.emptyText}>No trace logs found</Text></View>)}
                {logs.map((log, idx) => {
                    const ac = AC[log.agentName] || C.primary; const last = idx === logs.length - 1;
                    return (<View key={log.id} style={styles.tlItem}>
                        <View style={styles.tlLeft}><View style={[styles.tlDot, { backgroundColor: ac }]} />{!last && <View style={styles.tlLine} />}</View>
                        <View style={styles.tlContent}>
                            <View style={[styles.agentBadge, { backgroundColor: ac + '15' }]}><Text style={[styles.agentBadgeText, { color: ac }]}>{log.agentName}</Text></View>
                            <Text style={styles.stepName}>{log.stepName}</Text>
                            <Text style={styles.stepTime}>{new Date(log.createdAt).toLocaleTimeString()}</Text>
                            {log.outputSummary && (<View style={styles.outputBox}><Text style={styles.outputText} numberOfLines={4}>{log.outputSummary.substring(0, 200)}{log.outputSummary.length > 200 ? '…' : ''}</Text></View>)}
                        </View>
                    </View>);
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
    errorBanner: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FECACA' },
    errorText: { color: C.danger, fontSize: 13, fontWeight: '600' },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 18, marginBottom: 12 },
    runChip: { backgroundColor: C.card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border },
    runChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    chipDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    runChipText: { color: C.textSec, fontSize: 12, fontWeight: '700' },
    emptyCard: { backgroundColor: C.card, borderRadius: 16, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    emptyText: { color: C.textSec, fontSize: 14, fontWeight: '600', marginTop: 8 },
    tlItem: { flexDirection: 'row' },
    tlLeft: { width: 24, alignItems: 'center' },
    tlDot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
    tlLine: { width: 2, flex: 1, backgroundColor: C.border, marginVertical: 2 },
    tlContent: { flex: 1, marginLeft: 12, backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
    agentBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginBottom: 8 },
    agentBadgeText: { fontSize: 11, fontWeight: '700' },
    stepName: { color: C.text, fontSize: 13, fontWeight: '600' },
    stepTime: { color: C.textMuted, fontSize: 10, marginTop: 4 },
    outputBox: { backgroundColor: C.bg, borderRadius: 8, padding: 10, marginTop: 10 },
    outputText: { color: C.textMuted, fontSize: 10, fontFamily: 'monospace' },
});