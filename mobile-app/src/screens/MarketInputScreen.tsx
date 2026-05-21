import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import API_BASE_URL from '../config/api';

const C = {
    bg: '#F5F7FA', card: '#FFFFFF', header: '#1E3A5F', primary: '#4F46E5',
    accent: '#0EA5E9', success: '#059669', warning: '#D97706', text: '#1F2937',
    textSec: '#6B7280', textMuted: '#9CA3AF', border: '#E5E7EB',
    lightPurple: '#EEF2FF', lightBlue: '#F0F9FF', lightYellow: '#FFFBEB',
};

export default function MarketInputScreen() {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    const handleRunAgent = async () => {
        if (!content.trim()) { Alert.alert("Error", "Please enter some market text."); return; }
        setLoading(true);
        try {
            const createRes = await fetch(`${API_BASE_URL}/inputs/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
            if (!createRes.ok) throw new Error("Failed to create input");
            const input = await createRes.json();
            const runRes = await fetch(`${API_BASE_URL}/agent/run-from-input`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inputId: input.id }) });
            if (!runRes.ok) throw new Error("Failed to run agent");
            await runRes.json();
            setContent('');
            // Auto-navigate to Opportunities tab
            (navigation as any).navigate('Opportunities');
        } catch (error: any) { Alert.alert("Error", error.message); }
        finally { setLoading(false); }
    };

    return (
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
                <Text style={styles.headerLabel}>AI AGENT</Text>
                <Text style={styles.headerTitle}>Market Input</Text>
                <Text style={styles.headerSub}>Feed market intelligence to your AI agent</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.inputCard}>
                    <View style={styles.inputHeader}><Text style={{ fontSize: 18 }}>✍️</Text><Text style={styles.inputLabel}>Market Intelligence</Text></View>
                    <TextInput style={styles.textArea} multiline numberOfLines={10} placeholder="Enter trends, product ideas, keywords, or market observations..." placeholderTextColor={C.textMuted} value={content} onChangeText={setContent} />
                    <Text style={styles.charCount}>{content.length} characters</Text>
                </View>

                <TouchableOpacity style={[styles.runBtn, (loading || !content.trim()) && styles.runBtnDisabled]} onPress={handleRunAgent} disabled={loading || !content.trim()} activeOpacity={0.8}>
                    {loading ? (<View style={styles.loadingRow}><ActivityIndicator size="small" color="#fff" /><Text style={styles.runBtnText}>  Agent Processing...</Text></View>)
                        : (<Text style={styles.runBtnText}>🚀 Run Agent Workflow</Text>)}
                </TouchableOpacity>

                <View style={styles.stepsCard}>
                    <Text style={styles.stepsTitle}>🤖 What the Agent Does</Text>
                    {[{ dot: C.primary, text: 'Analyzes your input with Gemini AI' },
                    { dot: C.accent, text: 'Searches real eBay & Shopify for products' },
                    { dot: C.success, text: 'Finds profitable resale opportunities' },
                    { dot: C.warning, text: 'Auto-notifies you via Email, Telegram & WhatsApp' }
                    ].map((s, i) => (
                        <View key={i} style={styles.stepRow}><View style={[styles.stepDot, { backgroundColor: s.dot }]} /><Text style={styles.stepText}>{s.text}</Text></View>
                    ))}
                </View>

                <View style={styles.tipCard}>
                    <Text style={{ fontSize: 18 }}>💡</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.tipTitle}>Quick Start Ideas</Text>
                        <Text style={styles.tipText}>Try: "wireless earbuds trending" or "yoga mats for home gym" or "portable blender travel"</Text>
                    </View>
                </View>

                <View style={{ height: 30 }} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { backgroundColor: C.header, paddingHorizontal: 20, paddingTop: 58, paddingBottom: 22, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
    headerTitle: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 4 },
    headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
    content: { padding: 16 },
    inputCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    inputHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    inputLabel: { color: C.text, fontSize: 15, fontWeight: '700', marginLeft: 8 },
    textArea: { backgroundColor: C.bg, borderRadius: 12, padding: 16, fontSize: 15, color: C.text, textAlignVertical: 'top', minHeight: 180, borderWidth: 1, borderColor: C.border, lineHeight: 22 },
    charCount: { color: C.textMuted, fontSize: 11, textAlign: 'right', marginTop: 8 },
    runBtn: { backgroundColor: C.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 16, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
    runBtnDisabled: { backgroundColor: '#A5B4FC', shadowOpacity: 0 },
    runBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    loadingRow: { flexDirection: 'row', alignItems: 'center' },
    stepsCard: { backgroundColor: C.card, borderRadius: 16, padding: 18, marginTop: 22, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
    stepsTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 16 },
    stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    stepDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
    stepText: { color: C.textSec, fontSize: 13, flex: 1 },
    tipCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.lightYellow, borderRadius: 14, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#FDE68A' },
    tipTitle: { color: C.warning, fontSize: 13, fontWeight: '700', marginBottom: 4 },
    tipText: { color: C.textSec, fontSize: 12, lineHeight: 18 },
});