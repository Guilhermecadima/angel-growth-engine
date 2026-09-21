import React from 'react';
import { AlertCircle, ArrowDownRight, ArrowUpRight, Inbox, LoaderCircle, RefreshCw } from 'lucide-react';
import { compact, percent } from '../lib/analytics';

export function LoadingState({ label = 'A carregar dados…' }: { label?: string }) {
  return <div className="state-card" role="status"><LoaderCircle className="spin"/><strong>{label}</strong><span>Estamos a preparar a tua área.</span></div>;
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <div className="state-card"><Inbox/><strong>{title}</strong><span>{text}</span>{action}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-state" role="alert"><AlertCircle/><div><strong>Não foi possível concluir</strong><span>{message}</span></div>{retry && <button className="button ghost" onClick={retry}><RefreshCw/>Tentar novamente</button>}</div>;
}

export function Kpi({ label, value, change, detail, tone = 'violet' }: { label: string; value: number | string; change?: number; detail?: string; tone?: 'violet' | 'green' | 'red' | 'blue' }) {
  return <article className={`kpi ${tone}`}>
    <div className="kpi-top"><span>{label}</span>{typeof change === 'number' && <span className={`delta ${change >= 0 ? 'up' : 'down'}`}>{change >= 0 ? <ArrowUpRight/> : <ArrowDownRight/>}{percent(change)}</span>}</div>
    <strong>{typeof value === 'number' ? compact(value) : value}</strong>
    {detail && <small>{detail}</small>}
  </article>;
}

type ChartPoint = { date: string } & Record<string, number | string>;

export function LineChart({ data, series, height = 260 }: { data: ChartPoint[]; series: Array<{ key: string; label: string; color: string }>; height?: number }) {
  const width = 900;
  const pad = 28;
  const values = data.flatMap(point => series.map(item => Number(point[item.key] ?? 0)));
  const max = Math.max(...values, 1);
  const path = (key: string) => data.map((point, index) => {
    const x = pad + (index / Math.max(1, data.length - 1)) * (width - pad * 2);
    const y = height - pad - (Number(point[key] ?? 0) / max) * (height - pad * 2);
    return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  if (!data.length) return <EmptyState title="Sem evolução disponível" text="Liga uma fonte de dados ou importa um CSV para preencher este gráfico."/>;
  return <div className="chart">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução temporal das métricas">
      {[0.25, 0.5, 0.75].map(value => <line key={value} x1={pad} x2={width - pad} y1={height * value} y2={height * value} className="chart-grid"/>)}
      {series.map(item => <path key={item.key} d={path(item.key)} fill="none" stroke={item.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>)}
    </svg>
    <div className="chart-legend">{series.map(item => <span key={item.key}><i style={{ background: item.color }}/>{item.label}</span>)}</div>
  </div>;
}

export function SkeletonGrid() {
  return <div className="kpi-grid" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <div className="kpi skeleton" key={index}><i/><b/><span/></div>)}</div>;
}

export function Toast({ message, tone = 'success', onClose }: { message: string; tone?: 'success' | 'error'; onClose: () => void }) {
  React.useEffect(() => { const timer = window.setTimeout(onClose, 4200); return () => window.clearTimeout(timer); }, [onClose]);
  return <div className={`toast ${tone}`} role="status">{message}<button aria-label="Fechar" onClick={onClose}>×</button></div>;
}
