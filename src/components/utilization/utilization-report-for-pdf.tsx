
/**
 * @fileoverview This component is designed to be rendered to a static string
 * for PDF generation. It uses inline styles and basic layout elements to ensure
 * compatibility with the html-to-image and jsPDF libraries.
 * IMPORTANT: This component is NOT meant for direct client-side rendering in the browser.
 */
import React from 'react';
import type { AnalyseUtilizationDataOutput, UtilizationData } from '@/types';
import { AnnualUtilizationChart } from './annual-utilization-chart';
import { WeeklyUtilizationChart } from './weekly-utilization-chart';
import { format } from 'date-fns';

interface UtilizationReportProps {
  analysis: AnalyseUtilizationDataOutput;
  filterDescription: string;
  annualChartData: UtilizationData['annual'];
  weeklyChartData: UtilizationData['weekly'];
}

// Inline styles for PDF compatibility
const styles = {
    page: { fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#333', backgroundColor: '#fff', padding: '40px', width: '1123px', boxSizing: 'border-box' } as React.CSSProperties,
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px' } as React.CSSProperties,
    h1: { fontSize: '28px', fontWeight: 'bold' as 'bold', color: '#000', margin: '0' } as React.CSSProperties,
    h2: { fontSize: '20px', fontWeight: 'bold' as 'bold', color: '#000', borderBottom: '1px solid #eee', paddingBottom: '5px', marginTop: '30px', marginBottom: '15px' } as React.CSSProperties,
    h3: { fontSize: '16px', fontWeight: 'bold' as 'bold', color: '#111', margin: '15px 0 5px 0' } as React.CSSProperties,
    p: { margin: '0 0 10px 0', lineHeight: '1.5' } as React.CSSProperties,
    kpiContainer: { display: 'flex', justifyContent: 'space-around', gap: '20px', textAlign: 'center' as 'center', marginTop: '20px' } as React.CSSProperties,
    kpiBox: { padding: '15px', border: '1px solid #ddd', borderRadius: '8px', width: '200px' } as React.CSSProperties,
    kpiValue: { fontSize: '24px', fontWeight: 'bold' as 'bold', color: '#2962FF' } as React.CSSProperties,
    kpiLabel: { fontSize: '12px', color: '#666', marginTop: '5px' } as React.CSSProperties,
    section: { marginTop: '30px' } as React.CSSProperties,
    findingCard: { border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginBottom: '10px', backgroundColor: '#f9f9f9' } as React.CSSProperties,
    chartContainer: { width: '100%', height: '400px', marginTop: '20px' } as React.CSSProperties,
    grid: { display: 'flex', gap: '20px', marginTop: '20px' } as React.CSSProperties,
    gridCol: { flex: 1 } as React.CSSProperties,
};

const getSeverityStyle = (severity: 'Positive' | 'Neutral' | 'Warning' | 'Critical'): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '10px',
        fontWeight: 'bold',
        display: 'inline-block',
    };
    switch (severity) {
        case 'Positive': return { ...baseStyle, backgroundColor: '#dcfce7', color: '#166534' };
        case 'Warning': return { ...baseStyle, backgroundColor: '#fef9c3', color: '#854d0e' };
        case 'Critical': return { ...baseStyle, backgroundColor: '#fee2e2', color: '#991b1b' };
        default: return { ...baseStyle, backgroundColor: '#e5e7eb', color: '#374151' };
    }
};

export const UtilizationReportForPDF = ({ analysis, filterDescription, annualChartData, weeklyChartData }: UtilizationReportProps) => {
    const { executiveSummary, kpiAnalysis, keyFindings, recommendations } = analysis;
    const year = new Date().getFullYear();

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <h1 style={styles.h1}>Utilization Report {year}</h1>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ ...styles.p, margin: 0, fontWeight: 'bold' }}>CTPower</p>
                    <p style={{ ...styles.p, margin: 0, fontSize: '10px' }}>Generated: {format(new Date(), 'MMM d, yyyy')}</p>
                </div>
            </header>

            <section style={styles.section}>
                <p style={styles.p}><strong>Report For:</strong> {filterDescription}</p>
                <h2 style={{ ...styles.h2, marginTop: '20px' }}>Executive Summary</h2>
                <p style={styles.p}>{executiveSummary}</p>
            </section>

            <section style={styles.section}>
                <div style={styles.kpiContainer}>
                    <div style={styles.kpiBox}>
                        <div style={styles.kpiValue}>{kpiAnalysis.overallUtilization.value.toFixed(1)}%</div>
                        <div style={styles.kpiLabel}>Overall Utilization</div>
                    </div>
                    <div style={styles.kpiBox}>
                        <div style={styles.kpiValue}>{kpiAnalysis.scheduleVariance.value.toFixed(1)}%</div>
                        <div style={styles.kpiLabel}>Schedule Variance</div>
                    </div>
                    <div style={styles.kpiBox}>
                        <div style={styles.kpiValue}>{kpiAnalysis.totalHours.actual.toLocaleString()}</div>
                        <div style={styles.kpiLabel}>Total Billable Hours</div>
                    </div>
                     <div style={styles.kpiBox}>
                        <div style={styles.kpiValue}>{kpiAnalysis.totalHours.scheduled.toLocaleString()}</div>
                        <div style={styles.kpiLabel}>Total Scheduled Hours</div>
                    </div>
                </div>
            </section>

            <div style={styles.grid}>
                 <div style={styles.gridCol}>
                    <h2 style={styles.h2}>Key Findings</h2>
                    {keyFindings.map((finding, index) => (
                        <div key={index} style={styles.findingCard}>
                            <h3 style={{ ...styles.h3, marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={getSeverityStyle(finding.severity)}>{finding.severity}</span>
                                {finding.title}
                            </h3>
                            <p style={{...styles.p, margin: 0, fontSize: '11px'}}>{finding.description}</p>
                        </div>
                    ))}
                 </div>
                 <div style={styles.gridCol}>
                    <h2 style={styles.h2}>Recommendations</h2>
                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                        {recommendations.map((rec, index) => (
                            <li key={index} style={{ marginBottom: '10px' }}>{rec}</li>
                        ))}
                    </ul>
                 </div>
            </div>
            
            <div style={styles.chartContainer}>
                <h2 style={styles.h2}>Annual Utilization Trend</h2>
                <AnnualUtilizationChart data={annualChartData} />
            </div>

             <div style={styles.chartContainer}>
                <h2 style={styles.h2}>Weekly Performance</h2>
                 <WeeklyUtilizationChart data={weeklyChartData} />
            </div>

        </div>
    );
};
