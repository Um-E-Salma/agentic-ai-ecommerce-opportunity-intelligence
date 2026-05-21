import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Linking, TextInput, Alert } from 'react-native';
import API_BASE_URL from '../config/api';
const API = API_BASE_URL;
const C = { bg: '#F5F7FA', card: '#FFFFFF', header: '#1E3A5F', primary: '#4F46E5', accent: '#0EA5E9', success: '#059669', warning: '#D97706', danger: '#DC2626', text: '#1F2937', textSec: '#6B7280', textMuted: '#9CA3AF', border: '#E5E7EB', purple: '#7C3AED', orange: '#EA580C', lightGreen: '#ECFDF5', lightRed: '#FEF2F2', lightPurple: '#EEF2FF' };

export default function PurchasesScreen() {
    const [candidates, setCandidates] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<any>(null); const [platforms, setPlatforms] = useState<any[]>([]); const [filter, setFilter] = useState<string>('ALL');
    const [apiError, setApiError] = useState<string | null>(null);
    const [actionState, setActionState] = useState<Record<string, { type: 'approve' | 'reject' | 'purchase'; notes: string } | null>>({});
    const [listingDrafts, setListingDrafts] = useState<Record<string, any>>({}); const [selectedPlatform, setSelectedPlatform] = useState<Record<string, string>>({});
    const [optimizations, setOptimizations] = useState<Record<string, any>>({}); const [pricingOptions, setPricingOptions] = useState<Record<string, any[]>>({});
    const [selectedPricing, setSelectedPricing] = useState<Record<string, string>>({}); const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

    const fetchData = async () => { setApiError(null); try { const [cr, sr, pr] = await Promise.all([fetch(`${API}/purchase-candidates`), fetch(`${API}/analytics/dashboard`), fetch(`${API}/platforms/status`)]); if (!cr.ok) throw new Error(`Error ${cr.status}`); setCandidates(await cr.json()); if (sr.ok) { const s = await sr.json(); setStats(s.stats); } if (pr.ok) setPlatforms(await pr.json()); } catch (e: any) { setApiError(e.message); } finally { setLoading(false); setRefreshing(false); } };
    useEffect(() => { fetchData(); }, []); const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);
    const setAction = (id: string, type: 'approve' | 'reject' | 'purchase') => setActionState(prev => ({ ...prev, [id]: { type, notes: '' } }));
    const cancelAction = (id: string) => setActionState(prev => ({ ...prev, [id]: null }));
    const setNotes = (id: string, text: string) => setActionState(prev => { const c = prev[id]; if (!c) return prev; return { ...prev, [id]: { ...c, notes: text } }; });

    const confirmAction = async (cid: string) => { const info = actionState[cid]; if (!info) return; const ep = { approve: 'approve', reject: 'reject', purchase: 'mark-purchased' }; setSubmitting(prev => ({ ...prev, [cid]: true })); try { const r = await fetch(`${API}/purchase-candidates/${cid}/${ep[info.type]}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: info.notes }) }); if (r.ok) { Alert.alert('✅ Done', `${info.type === 'approve' ? 'Approved' : info.type === 'reject' ? 'Rejected' : 'Purchased'} successfully!`); cancelAction(cid); fetchData(); } else { const e = await r.json(); Alert.alert('Error', e.error || 'Failed'); } } catch (e: any) { Alert.alert('Error', e.message); } finally { setSubmitting(prev => ({ ...prev, [cid]: false })); } };
    const handleOpenSourcePage = async (c: any) => { try { await fetch(`${API}/purchase-candidates/${c.id}/opened`, { method: 'POST' }); fetchData(); if (c.sourceUrl) Linking.openURL(c.sourceUrl); else Alert.alert('Info', 'No Source URL stored. Status updated.'); } catch (e: any) { Alert.alert('Error', e.message); } };
    const generateListingDraft = async (cid: string) => { setSubmitting(prev => ({ ...prev, [cid]: true })); try { const r = await fetch(`${API}/listings/recommend-candidate/${cid}`, { method: 'POST' }); if (!r.ok) throw new Error("Failed"); const d = await r.json(); setListingDrafts(prev => ({ ...prev, [cid]: d })); setSelectedPlatform(prev => ({ ...prev, [cid]: 'mock' })); } catch (e: any) { Alert.alert("Error", e.message); } finally { setSubmitting(prev => ({ ...prev, [cid]: false })); } };
    const submitListing = async (cid: string) => { const d = listingDrafts[cid]; const p = selectedPlatform[cid]; if (!d || !p) return; setSubmitting(prev => ({ ...prev, [cid]: true })); try { const r = await fetch(`${API}/listings/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidateId: cid, platform: p, title: d.title, description: d.description, price: d.recommendedPrice, tags: d.tags, category: 'General' }) }); if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed"); } Alert.alert("✅ Published", "Listing created!"); setListingDrafts(prev => ({ ...prev, [cid]: null })); fetchData(); } catch (e: any) { Alert.alert("Error", e.message); } finally { setSubmitting(prev => ({ ...prev, [cid]: false })); } };
    const optimizeListing = async (lid: string) => { setSubmitting(prev => ({ ...prev, [lid]: true })); try { const r = await fetch(`${API}/listings/${lid}/optimize`, { method: 'POST' }); if (!r.ok) throw new Error("Failed"); const o = await r.json(); const pr = await fetch(`${API}/listings/${lid}/pricing-options`); const ps = await pr.json(); setOptimizations(prev => ({ ...prev, [lid]: o })); setPricingOptions(prev => ({ ...prev, [lid]: ps })); setSelectedPricing(prev => ({ ...prev, [lid]: 'BALANCED' })); fetchData(); } catch (e: any) { Alert.alert("Error", e.message); } finally { setSubmitting(prev => ({ ...prev, [lid]: false })); } };
    const applyOptimization = async (lid: string, oid: string) => { setSubmitting(prev => ({ ...prev, [lid]: true })); try { const r = await fetch(`${API}/listings/${lid}/apply-optimization`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ optimizationId: oid, selectedPricingStrategy: selectedPricing[lid] }) }); if (!r.ok) throw new Error("Failed"); Alert.alert("✅ Applied!"); setOptimizations(prev => ({ ...prev, [lid]: null })); fetchData(); } catch (e: any) { Alert.alert("Error", e.message); } finally { setSubmitting(prev => ({ ...prev, [lid]: false })); } };
    const revertOptimization = async (lid: string, oid: string) => { setSubmitting(prev => ({ ...prev, [lid]: true })); try { const r = await fetch(`${API}/listings/${lid}/revert-optimization`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ optimizationId: oid }) }); if (!r.ok) throw new Error("Failed"); Alert.alert("Reverted"); fetchData(); } catch (e: any) { Alert.alert("Error", e.message); } finally { setSubmitting(prev => ({ ...prev, [lid]: false })); } };

    const getSI = (st: string) => ({ NEW: { label: 'New', color: C.accent }, APPROVED_TO_BUY: { label: 'Approved', color: C.warning }, OPENED_FOR_MANUAL_PURCHASE: { label: 'Source Opened', color: C.orange }, PURCHASED_MANUALLY: { label: 'Purchased', color: C.success }, REJECTED: { label: 'Rejected', color: C.danger } }[st] || { label: st, color: C.textMuted });
    const FILTERS = [{ key: 'ALL', label: 'All' }, { key: 'NEW', label: 'New' }, { key: 'APPROVED', label: 'Approved' }, { key: 'PURCHASED', label: 'Purchased' }, { key: 'REJECTED', label: 'Rejected' }];
    const filtered = candidates.filter(c => { if (filter === 'ALL') return true; if (filter === 'NEW') return c.status === 'NEW'; if (filter === 'APPROVED') return c.status === 'APPROVED_TO_BUY' || c.status === 'OPENED_FOR_MANUAL_PURCHASE'; if (filter === 'PURCHASED') return c.status === 'PURCHASED_MANUALLY'; if (filter === 'REJECTED') return c.status === 'REJECTED'; return true; });

    if (loading) return (<View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={C.primary} /></View>);

    return (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}>
            <View style={styles.header}><Text style={styles.headerLabel}>PURCHASE FLOW</Text><View style={styles.headerRow}><Text style={styles.headerTitle}>Purchases</Text><TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}><Text style={styles.refreshBtnText}>⟳</Text></TouchableOpacity></View></View>
            <View style={styles.content}>
                {apiError && (<View style={styles.errorBanner}><Text style={styles.errorText}>⚠️ {apiError}</Text></View>)}
                <View style={styles.statsRow}>
                    {[{ l: 'Total', v: stats?.totalPurchaseCandidates ?? 0, c: C.accent }, { l: 'Approved', v: stats?.totalApproved ?? 0, c: C.warning }, { l: 'Purchased', v: stats?.totalPurchasedManually ?? 0, c: C.success }, { l: 'Rejected', v: stats?.totalRejected ?? 0, c: C.danger }].map(s => (
                        <View key={s.l} style={styles.statBox}><Text style={[styles.statVal, { color: s.c }]}>{s.v}</Text><Text style={styles.statLbl}>{s.l}</Text></View>
                    ))}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                    {FILTERS.map(f => (<TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterChipActive]} onPress={() => setFilter(f.key)}><Text style={[styles.filterChipText, filter === f.key && { color: '#fff' }]}>{f.label}</Text></TouchableOpacity>))}
                </ScrollView>
                {filtered.length === 0 && !apiError && (<View style={styles.emptyCard}><Text style={{ fontSize: 28 }}>🛒</Text><Text style={styles.emptyText}>{filter === 'ALL' ? 'No purchase candidates yet' : `No ${filter.toLowerCase()} candidates`}</Text></View>)}

                {filtered.map(c => {
                    const si = getSI(c.status); const active = actionState[c.id]; const isSub = submitting[c.id];
                    return (<View key={c.id} style={styles.card}>
                        <View style={styles.cardHeader}><Text style={styles.cardTitle} numberOfLines={2}>{c.opportunity?.title || 'Unknown'}</Text><View style={[styles.badge, { backgroundColor: si.color + '15' }]}><Text style={[styles.badgeText, { color: si.color }]}>{si.label}</Text></View></View>
                        <Text style={styles.cardMeta}>{c.opportunity?.sourcePlatform || 'N/A'}</Text>
                        <View style={styles.metricsRow}>
                            <View style={styles.metricBox}><Text style={styles.metricLbl}>Profit</Text><Text style={[styles.metricVal, { color: C.success }]}>+${c.projectedProfit?.toFixed(2) ?? '0'}</Text></View>
                            <View style={styles.metricBox}><Text style={styles.metricLbl}>ROI</Text><Text style={[styles.metricVal, { color: C.success }]}>{c.roiPercent?.toFixed(1) ?? '0'}%</Text></View>
                            <View style={styles.metricBox}><Text style={styles.metricLbl}>Created</Text><Text style={styles.metricVal}>{new Date(c.createdAt).toLocaleDateString()}</Text></View>
                        </View>
                        {active ? (
                            <View style={styles.actionPanel}><Text style={styles.panelTitle}>{active.type === 'approve' ? '✅ Approval Notes' : active.type === 'reject' ? '❌ Rejection Reason' : '📦 Order Ref'}</Text>
                                <TextInput style={styles.notesInput} placeholder="Notes..." placeholderTextColor={C.textMuted} value={active.notes} onChangeText={t => setNotes(c.id, t)} multiline />
                                <View style={styles.panelBtns}><TouchableOpacity style={styles.cancelBtn} onPress={() => cancelAction(c.id)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: active.type === 'reject' ? C.danger : C.success }]} onPress={() => confirmAction(c.id)} disabled={isSub}>{isSub ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.confirmBtnText}>Submit</Text>}</TouchableOpacity></View></View>
                        ) : (
                            <View style={styles.actionsRow}>
                                {c.status === 'NEW' && (<><TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.success }]} onPress={() => setAction(c.id, 'approve')}><Text style={styles.actionBtnText}>✅ Approve</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.danger }]} onPress={() => setAction(c.id, 'reject')}><Text style={styles.actionBtnText}>❌ Reject</Text></TouchableOpacity></>)}
                                {(c.status === 'APPROVED_TO_BUY' || c.status === 'OPENED_FOR_MANUAL_PURCHASE') && (<TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.accent, flex: 1 }]} onPress={() => handleOpenSourcePage(c)}><Text style={styles.actionBtnText}>🔗 Open Source Page</Text></TouchableOpacity>)}
                                {c.status === 'OPENED_FOR_MANUAL_PURCHASE' && (<TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.success }]} onPress={() => setAction(c.id, 'purchase')}><Text style={styles.actionBtnText}>📦 Mark Purchased</Text></TouchableOpacity>)}
                            </View>
                        )}
                        {c.status === 'PURCHASED_MANUALLY' && !active && !listingDrafts[c.id] && (<TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.purple, marginTop: 12 }]} onPress={() => generateListingDraft(c.id)} disabled={isSub}>{isSub ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnText}>✨ Generate Listing</Text>}</TouchableOpacity>)}
                        {listingDrafts[c.id] && (<View style={styles.draftPanel}><Text style={styles.draftTitle}>📝 Listing Draft</Text>
                            <Text style={styles.draftInfo}>Title: <Text style={{ fontWeight: '700', color: C.text }}>{listingDrafts[c.id].title}</Text></Text>
                            <Text style={styles.draftInfo}>Price: <Text style={{ fontWeight: '700', color: C.success }}>${listingDrafts[c.id].recommendedPrice}</Text></Text>
                            <Text style={styles.draftInfo}>Platform:</Text>
                            <View style={styles.platRow}>{['ebay_sandbox', 'shopify_dev', 'woocommerce_test', 'mock'].map(pl => { const pd = platforms.find(p => p.platform === pl); const ok = pd?.configured || pl === 'mock'; return (<TouchableOpacity key={pl} style={[styles.platChip, selectedPlatform[c.id] === pl && styles.platChipActive, !ok && { opacity: 0.3 }]} onPress={() => ok && setSelectedPlatform(prev => ({ ...prev, [c.id]: pl }))} disabled={!ok}><Text style={[styles.platChipText, selectedPlatform[c.id] === pl && { color: '#fff' }]}>{pl.split('_')[0].toUpperCase()}</Text></TouchableOpacity>); })}</View>
                            <View style={styles.panelBtns}><TouchableOpacity style={styles.cancelBtn} onPress={() => setListingDrafts(prev => ({ ...prev, [c.id]: null }))}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: C.purple }]} onPress={() => submitListing(c.id)} disabled={isSub}>{isSub ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.confirmBtnText}>Publish</Text>}</TouchableOpacity></View></View>)}
                        {c.notes && (<View style={styles.notesBlock}><Text style={styles.notesBlockLabel}>📝 {c.notes}</Text></View>)}
                        {c.DemoListing?.length > 0 && (<View style={{ marginTop: 14 }}><Text style={styles.listingsTitle}>🛒 Listings</Text>
                            {c.DemoListing.map((dl: any) => {
                                const opt = optimizations[dl.id]; const prices = pricingOptions[dl.id]; const iO = submitting[dl.id];
                                return (<View key={dl.id} style={styles.dlCard}><Text style={styles.dlTitle}>{dl.title}</Text><Text style={styles.dlInfo}>{dl.platform.toUpperCase()} • ${dl.recommendedPrice} • {dl.status.replace(/_/g, ' ')}</Text><Text style={styles.dlInfo}>Quality: {dl.latestQualityScore ? `${dl.latestQualityScore}/100` : 'Not Scored'}</Text>
                                    {!opt && (<TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.orange, marginTop: 10 }]} onPress={() => optimizeListing(dl.id)} disabled={iO}>{iO ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnText}>✨ Optimize</Text>}</TouchableOpacity>)}
                                    {opt && (<View style={styles.optPanel}><Text style={styles.optTitle}>✨ Optimization</Text><Text style={styles.optInfo}>Quality: <Text style={{ color: C.danger }}>{opt.oldQualityScore}</Text> → <Text style={{ color: C.success, fontWeight: '800' }}>{opt.newQualityScore}</Text></Text>
                                        <Text style={styles.optInfo}>Title:</Text><Text style={{ color: C.danger, fontSize: 12, textDecorationLine: 'line-through', marginTop: 4 }}>{opt.originalTitle}</Text><Text style={{ color: C.success, fontSize: 12, fontWeight: '700', marginTop: 4 }}>{opt.optimizedTitle}</Text>
                                        {prices && (<View style={styles.pricingRow}>{prices.map((p: any) => (<TouchableOpacity key={p.strategy} style={[styles.pricingChip, selectedPricing[dl.id] === p.strategy && styles.pricingChipActive]} onPress={() => setSelectedPricing(prev => ({ ...prev, [dl.id]: p.strategy }))}><Text style={[styles.pricingChipText, selectedPricing[dl.id] === p.strategy && { color: '#fff' }]}>{p.strategy.substring(0, 3)} ${p.price.toFixed(0)}</Text></TouchableOpacity>))}</View>)}
                                        <View style={styles.panelBtns}><TouchableOpacity style={styles.cancelBtn} onPress={() => revertOptimization(dl.id, opt.id)} disabled={iO}><Text style={styles.cancelBtnText}>Revert</Text></TouchableOpacity>
                                            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: C.success }]} onPress={() => applyOptimization(dl.id, opt.id)} disabled={iO}>{iO ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.confirmBtnText}>Apply</Text>}</TouchableOpacity></View></View>)}</View>);
                            })}</View>)}
                        <View style={styles.timeline}>{[{ l: 'Discovered', d: c.createdAt }, { l: 'Approved', d: c.approvedAt }, { l: 'Rejected', d: c.rejectedAt }, { l: 'Source Opened', d: c.openedAt }, { l: 'Purchased', d: c.purchasedManuallyAt }].filter(e => e.d).map(e => (<View key={e.l} style={styles.tlRow}><View style={styles.tlDot} /><Text style={styles.tlLabel}>{e.l}</Text><Text style={styles.tlDate}>{new Date(e.d!).toLocaleDateString()}</Text></View>))}</View>
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
    statsRow: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 16, paddingVertical: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
    statBox: { flex: 1, alignItems: 'center' }, statVal: { fontSize: 22, fontWeight: '800' }, statLbl: { fontSize: 10, color: C.textMuted, marginTop: 4, textTransform: 'uppercase' },
    filterChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: C.card, marginRight: 8, borderWidth: 1, borderColor: C.border },
    filterChipActive: { backgroundColor: C.primary, borderColor: C.primary }, filterChipText: { color: C.textSec, fontSize: 12, fontWeight: '700' },
    emptyCard: { backgroundColor: C.card, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    emptyText: { color: C.textSec, fontSize: 14, fontWeight: '600', marginTop: 8, textAlign: 'center' },
    card: { backgroundColor: C.card, borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    cardTitle: { color: C.text, fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
    cardMeta: { color: C.textMuted, fontSize: 11, marginBottom: 10 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }, badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    metricsRow: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 12, padding: 12, marginBottom: 10 },
    metricBox: { flex: 1, alignItems: 'center' }, metricLbl: { color: C.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' }, metricVal: { color: C.text, fontSize: 14, fontWeight: '800', marginTop: 4 },
    actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }, actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    actionPanel: { backgroundColor: C.bg, borderRadius: 14, padding: 16, marginTop: 10 },
    panelTitle: { color: C.text, fontSize: 13, fontWeight: '700', marginBottom: 10 },
    notesInput: { backgroundColor: C.card, borderRadius: 10, padding: 12, fontSize: 14, color: C.text, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: C.border },
    panelBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border }, cancelBtnText: { color: C.textSec, fontSize: 13, fontWeight: '700' },
    confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' }, confirmBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    notesBlock: { backgroundColor: C.bg, borderRadius: 10, padding: 12, marginTop: 10 }, notesBlockLabel: { color: C.textSec, fontSize: 12 },
    draftPanel: { backgroundColor: C.lightPurple, borderRadius: 14, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#C7D2FE' },
    draftTitle: { color: C.text, fontSize: 14, fontWeight: '700', marginBottom: 10 }, draftInfo: { color: C.textSec, fontSize: 12, marginTop: 4 },
    platRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
    platChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border }, platChipActive: { backgroundColor: C.primary, borderColor: C.primary }, platChipText: { color: C.textSec, fontSize: 11, fontWeight: '700' },
    listingsTitle: { color: C.text, fontSize: 14, fontWeight: '700', marginBottom: 10 },
    dlCard: { backgroundColor: C.bg, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border }, dlTitle: { color: C.text, fontSize: 13, fontWeight: '700' }, dlInfo: { color: C.textMuted, fontSize: 11, marginTop: 3 },
    optPanel: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginTop: 10, borderWidth: 1, borderColor: '#C7D2FE' }, optTitle: { color: C.primary, fontSize: 13, fontWeight: '700', marginBottom: 8 }, optInfo: { color: C.textSec, fontSize: 12, marginTop: 4 },
    pricingRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
    pricingChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border }, pricingChipActive: { backgroundColor: C.primary, borderColor: C.primary }, pricingChipText: { color: C.textSec, fontSize: 11, fontWeight: '700' },
    timeline: { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
    tlRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }, tlDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, marginRight: 10 },
    tlLabel: { color: C.textSec, fontSize: 11, fontWeight: '600', width: 100 }, tlDate: { color: C.textMuted, fontSize: 11 },
});